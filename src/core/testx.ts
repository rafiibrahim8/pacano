import { KVStore } from '../models/keyValuePairModel';

export async function testFunc() {
  console.log('on testFunc');
  await testFuncImpl();
  console.log('end testFunc');
}

async function testFuncImpl() {
  await KVStore.upsert({ key: 'testk', value: 'testv' });
  const value = await KVStore.findOne({ where: { key: 'testk' } });
  console.log(value);
  console.log(value?.dataValues);
  console.log(value?.dataValues.value);
  console.log(value?.dataValues.key);
}
