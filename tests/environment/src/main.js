import { C1, C2 } from './shake';
// eslint-disable-next-line no-console
console.log(process.env.UNIQID1, C1);

if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.log(C2);
}
