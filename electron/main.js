const { app, BrowserWindow, shell, utilityProcess } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');

const isDev = !app.isPackaged;
const PORT = 3000;

// 显式设置应用名，使 userData 目录为 "Meego Lite" 而非 package.json 的 name
app.setName('Meego Lite');

let nextServerProcess = null;
let mainWindow = null;

// 等待端口可用
function waitForPort(port, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - start > timeout) {
          reject(new Error('Next.js server start timeout'));
        } else {
          setTimeout(check, 300);
        }
      });
      socket.once('timeout', () => {
        socket.destroy();
        if (Date.now() - start > timeout) {
          reject(new Error('Next.js server start timeout'));
        } else {
          setTimeout(check, 300);
        }
      });
      socket.connect(port, '127.0.0.1');
    };
    check();
  });
}

// 准备数据库文件：把 prisma/dev.db 复制到 userData 目录
function setupDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'meego-lite.db');

  if (!fs.existsSync(dbPath)) {
    // 找到打包后的初始 db 文件
    const seedDbPath = isDev
      ? path.join(__dirname, '..', 'prisma', 'dev.db')
      : path.join(process.resourcesPath, 'prisma', 'dev.db');

    if (fs.existsSync(seedDbPath)) {
      fs.copyFileSync(seedDbPath, dbPath);
      console.log('[electron] DB initialized at', dbPath);
    } else {
      console.warn('[electron] seed db not found at', seedDbPath);
    }
  }
  return dbPath;
}

// 启动 Next.js standalone server
function startNextServer(dbPath) {
  const serverPath = isDev
    ? path.join(__dirname, '..', '.next', 'standalone', 'server.js')
    : path.join(process.resourcesPath, 'app', 'server.js');

  // 使用 Electron 的 utilityProcess.fork 启动一个独立 Node.js 子进程，
  // 它内部就是纯 Node 运行时，不会触发 app.whenReady，
  // 因此不会出现"主进程递归 spawn 自己 → 弹出多个窗口"的问题。
  nextServerProcess = utilityProcess.fork(serverPath, [], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
      DATABASE_URL: `file:${dbPath}`,
    },
  });

  nextServerProcess.on('exit', (code) => {
    console.log('[electron] next server exited with code', code);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Meego Lite',
    icon: path.join(__dirname, '..', 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  // 外链用系统浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// 单例锁：防止用户重复双击应用图标启动多个实例
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(bootstrap);
}

// 启动（或重新启动）后端 server 并创建窗口
async function bootstrap() {
  try {
    // 若 server 不存在（被关窗时杀掉），重新拉起
    if (!nextServerProcess) {
      const dbPath = setupDatabase();
      startNextServer(dbPath);
      await waitForPort(PORT);
    }
    createWindow();
  } catch (e) {
    console.error('[electron] startup failed:', e);
    app.quit();
  }
}

app.on('window-all-closed', () => {
  if (nextServerProcess) {
    nextServerProcess.kill();
    nextServerProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (nextServerProcess) {
    nextServerProcess.kill();
    nextServerProcess = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    bootstrap();
  }
});
