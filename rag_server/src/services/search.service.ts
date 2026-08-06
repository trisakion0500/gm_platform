import { embed } from "../embedding/embedder";
import { searchSimilar } from "../index/store";
import { SearchResult } from "../types";

/**
 * 질의를 임베딩한 뒤 Qdrant에서 가장 유사한 청크를 검색한다.
 * @param query 검색어
 * @param topK 반환할 최대 개수
 * @returns 유사도 내림차순 검색 결과
 */
export async function search(query: string, topK: number): Promise<SearchResult[]> {
  const vector = await embed(query);
  return searchSimilar(vector, topK);
}
