import { Chunk } from "../types";

// 청크 하나의 최대 길이(문단 단위 재분할 기준)
const MAX_CHUNK_LENGTH = 1200;
// 이보다 짧은 본문의 섹션은 독립 청크로 만들지 않고 다음 섹션에 이어붙인다(제목만 있는 섹션 방지)
const MIN_CHUNK_LENGTH = 30;

interface RawSection {
  headingPath: string;
  lines: string[];
}

/**
 * 마크다운 문서를 헤딩(#~####) 단위로 분할한다.
 * 헤딩은 상위 헤딩까지 " > "로 이어붙인 breadcrumb 형태로 heading 필드에 담는다
 * (예: "4. Tool 목록 > 전 역할 공통 (10개)"). 본문이 거의 없는 섹션(제목만 있는 헤딩,
 * 파일 앞부분의 제목 중복 등)은 독립 청크로 만들지 않고 다음 섹션 본문에 이어붙이며,
 * 반대로 너무 긴 섹션은 문단(빈 줄) 단위로 재분할한다.
 * @param file 표시용 파일 경로 (예: "docs/07_API_COMMON.md", "README.md")
 * @param content 마크다운 원문
 * @returns 청크 목록
 */
export function chunkMarkdown(file: string, content: string): Chunk[] {
  const rawSections = splitByHeading(content, file);

  const chunks: Chunk[] = [];
  let pendingText = "";

  for (const section of rawSections) {
    const sectionBody = section.lines.join("\n").trim();
    const body = [pendingText, sectionBody].filter(Boolean).join("\n\n");

    if (body.length < MIN_CHUNK_LENGTH) {
      pendingText = body;
      continue;
    }

    pendingText = "";
    for (const part of splitByLength(body, MAX_CHUNK_LENGTH))
      chunks.push({ file, heading: section.headingPath || file, text: part });
  }

  if (pendingText.trim().length > 0) {
    if (chunks.length > 0)
      chunks[chunks.length - 1].text += `\n\n${pendingText.trim()}`;
    else
      chunks.push({ file, heading: file, text: pendingText.trim() });
  }

  return chunks;
}

/**
 * 헤딩 라인(#~####) 기준으로 원문을 섹션 목록으로 나눈다. 수평선("---")은 본문에서 제외한다.
 * @param content 마크다운 원문
 * @param file 첫 헤딩 이전 내용의 fallback heading으로 쓸 파일 경로
 * @returns 헤딩 경로(breadcrumb)와 본문 라인을 담은 섹션 목록
 */
function splitByHeading(content: string, file: string): RawSection[] {
  const headingStack: string[] = [];
  const sections: RawSection[] = [];
  let current: RawSection = { headingPath: file, lines: [] };

  for (const line of content.split(/\r?\n/)) {
    const match = /^(#{1,4})\s+(.+?)\s*$/.exec(line);
    if (match) {
      sections.push(current);
      const level = match[1].length;
      headingStack.length = level - 1;
      headingStack[level - 1] = match[2].trim();
      current = { headingPath: headingStack.filter(Boolean).join(" > "), lines: [] };
      continue;
    }
    if (line.trim() !== "---")
      current.lines.push(line);
  }
  sections.push(current);

  return sections;
}

/**
 * 문단(빈 줄 기준)을 순서대로 이어붙이며 maxLength를 넘지 않는 조각으로 나눈다.
 * 마크다운 표처럼 빈 줄 없이 긴 문단 하나가 그 자체로 maxLength를 넘으면 줄 단위로 재분할한다(packByLine).
 * @param text 원문
 * @param maxLength 조각당 최대 길이
 * @returns 분할된 텍스트 조각 목록 (길이 초과 없으면 원문 그대로 1개)
 */
function splitByLength(text: string, maxLength: number): string[] {
  if (text.length <= maxLength)
    return [text];

  const paragraphs = text.split(/\n{2,}/);
  const parts: string[] = [];
  let buffer = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxLength) {
      if (buffer) {
        parts.push(buffer);
        buffer = "";
      }
      parts.push(...packByLine(paragraph, maxLength));
      continue;
    }

    const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxLength && buffer) {
      parts.push(buffer);
      buffer = paragraph;
    } else {
      buffer = candidate;
    }
  }
  if (buffer)
    parts.push(buffer);

  return parts;
}

/** 마크다운 표의 행("| a | b |" 형식) 여부 판정 */
function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|");
}

/** 마크다운 표의 헤더 구분행("| --- | --- |" 형식, 대시·콜론·파이프·공백만으로 구성) 여부 판정 */
function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  return isTableRow(trimmed) && /^[|:\-\s]+$/.test(trimmed) && trimmed.includes("-");
}

/** 표 행 하나를 셀 배열로 분해한다(앞뒤 파이프 제거 후 "|" 기준 분할, 각 셀 trim) */
function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);
}

/**
 * 임베딩 전용 전처리 — 청크 본문(text)에 포함된 마크다운 표를 파이프·구분행이 없는 평문(셀을
 * 공백으로 이어붙인 줄)으로 변환한다. `02_TECH_STACK.md`처럼 표만으로 이루어진 섹션은 원본 그대로
 * 임베딩하면 "| 항목 | 결정 |\n| --- | --- |\n| Runtime | Node.js 22 LTS |" 같은 파이프투성이
 * 텍스트가 되어, 자연어 문장 위주로 학습된 임베딩 모델이 의미를 거의 못 잡는 문제가 있었다(실측:
 * "Express"/"bcrypt"/"mysql2"를 그대로 검색해도 이 표를 담은 청크가 top_k=20 밖으로 밀려남).
 * Qdrant에 저장하는 `chunk.text`(검색 결과로 그대로 노출되는 원본)는 건드리지 않고, 임베딩 호출
 * 직전에만(`reindex.ts`) 이 함수를 거친 텍스트를 사용한다 — 표시용/임베딩용 텍스트를 분리한다.
 * @param text 청크 원문(마크다운)
 * @returns 표 구간이 평문으로 치환된 텍스트(표가 없으면 원문과 동일)
 */
export function flattenTablesForEmbedding(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (isTableRow(lines[i]) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      out.push(splitTableRow(lines[i]).join(" "));
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) {
        out.push(splitTableRow(lines[i]).join(" "));
        i++;
      }
      continue;
    }
    out.push(lines[i]);
    i++;
  }

  return out.join("\n");
}

/**
 * 줄바꿈 단위로 이어붙이며 maxLength를 넘지 않는 조각으로 나눈다. splitByLength가 문단째로는
 * 못 쪼갤 때(빈 줄 없는 긴 마크다운 표 등)의 fallback. 줄 하나가 그 자체로 maxLength를 넘으면
 * 그 줄만 단독으로 초과 상태로 남긴다(더 잘게 쪼갤 실익이 적어 여기서 멈춘다).
 * @param text 원문
 * @param maxLength 조각당 최대 길이
 * @returns 분할된 텍스트 조각 목록
 */
function packByLine(text: string, maxLength: number): string[] {
  const lines = text.split("\n");
  const parts: string[] = [];
  let buffer = "";

  for (const line of lines) {
    const candidate = buffer ? `${buffer}\n${line}` : line;
    if (candidate.length > maxLength && buffer) {
      parts.push(buffer);
      buffer = line;
    } else {
      buffer = candidate;
    }
  }
  if (buffer)
    parts.push(buffer);

  return parts;
}
