import pool from '../config/db';
import { getUser, updateUser } from '../db/user.db';
import { encrypt, decrypt } from '../utils/crypto';

const SEED_USER_IDS = [1, 2, 3, 4];
const DUMMY_PHONE = '000-0000-0000';

/**
 * 시드 계정(user_id 1~4: sa/dev/apv/op)의 phone_number를 현재 ENCRYPTION_KEY로 복호화 시도하고,
 * 실패하면(키 교체로 기존 시드 암호문이 무효화된 경우) 더미 값으로 재암호화해 갱신한다.
 * 대상을 시드 4개 계정으로 한정 — 실제 사용자 데이터는 절대 건드리지 않는다.
 * @author trisakion
 * @returns void
 */
async function run(): Promise<void> {
  for (const userId of SEED_USER_IDS) {
    const user = await getUser(userId);
    if (!user) {
      console.log(`user_id=${userId} — 사용자 없음, 건너뜀`);
      continue;
    }
    try {
      decrypt(user.phone_number);
      console.log(`user_id=${userId} (${user.login_id}) — 정상 복호화, 변경 없음`);
    } catch {
      await updateUser(userId, null, null, encrypt(DUMMY_PHONE), null, null, null);
      console.log(`user_id=${userId} (${user.login_id}) — 복호화 실패, ${DUMMY_PHONE}로 재암호화하여 초기화`);
    }
  }
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
