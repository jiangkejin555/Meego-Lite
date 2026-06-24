import { NextResponse } from "next/server";
const res = NextResponse.json({ test: 1 });
res.cookies.delete("meego_session");
console.log(res.headers.get("set-cookie"));
