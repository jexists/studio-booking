declare module 'pdf-parse' {
  type ParseResult = { text: string };
  export default function pdf(buffer: Buffer): Promise<ParseResult>;
}
