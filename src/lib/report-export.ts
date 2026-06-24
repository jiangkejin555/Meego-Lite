import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ExternalHyperlink,
} from "docx";

export interface ReportLike {
  title: string;
  content: string;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(title: string) {
  return title.replace(/[\\/:*?"<>|]/g, "_").trim() || "report";
}

export function exportMarkdown(report: ReportLike) {
  const blob = new Blob([report.content], {
    type: "text/markdown;charset=utf-8",
  });
  downloadBlob(blob, `${safeFilename(report.title)}.md`);
}

type InlineChild = TextRun | ExternalHyperlink;

// Parse inline **bold** and [text](url) into docx runs. Anything else is plain.
function parseInline(text: string): InlineChild[] {
  const children: InlineChild[] = [];
  const pattern = /(\*\*([^*]+)\*\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      children.push(new TextRun(text.slice(lastIndex, match.index)));
    }
    if (match[2] !== undefined) {
      children.push(new TextRun({ text: match[2], bold: true }));
    } else if (match[4] !== undefined && match[5] !== undefined) {
      children.push(
        new ExternalHyperlink({
          children: [new TextRun({ text: match[4], style: "Hyperlink" })],
          link: match[5],
        })
      );
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    children.push(new TextRun(text.slice(lastIndex)));
  }
  if (children.length === 0) children.push(new TextRun(""));
  return children;
}

function markdownToParagraphs(markdown: string): Paragraph[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const paragraphs: Paragraph[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      paragraphs.push(new Paragraph(""));
      continue;
    }

    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const level =
        h[1].length === 1
          ? HeadingLevel.HEADING_1
          : h[1].length === 2
          ? HeadingLevel.HEADING_2
          : HeadingLevel.HEADING_3;
      paragraphs.push(
        new Paragraph({ heading: level, children: parseInline(h[2]) })
      );
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      paragraphs.push(
        new Paragraph({ bullet: { level: 0 }, children: parseInline(bullet[1]) })
      );
      continue;
    }

    const ordered = /^\d+\.\s+(.*)$/.exec(line);
    if (ordered) {
      paragraphs.push(
        new Paragraph({
          numbering: { reference: "report-numbering", level: 0 },
          children: parseInline(ordered[1]),
        })
      );
      continue;
    }

    paragraphs.push(new Paragraph({ children: parseInline(line) }));
  }

  return paragraphs;
}

export async function exportDocx(report: ReportLike) {
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "report-numbering",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: "left",
            },
          ],
        },
      ],
    },
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            children: [new TextRun({ text: report.title, bold: true })],
          }),
          ...markdownToParagraphs(report.content),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${safeFilename(report.title)}.docx`);
}
