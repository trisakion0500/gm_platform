import { encrypt } from '../utils/crypto';

const plainText = process.argv[2];
if (!plainText) {
  console.error('사용법: npm run encrypt -- "암호화할 평문"');
  process.exit(1);
}
console.log(encrypt(plainText));
