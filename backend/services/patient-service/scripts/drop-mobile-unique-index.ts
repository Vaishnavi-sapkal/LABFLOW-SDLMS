import mongoose from 'mongoose';

async function dropMobileUniqueIndex() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(uri);
  const collection = mongoose.connection.collection('patients');
  const indexes = await collection.indexes();
  const mobileUniqueIndex = indexes.find((index) => (
    index.unique === true &&
    index.key &&
    Object.keys(index.key).length === 1 &&
    index.key.mobile === 1
  ));

  if (!mobileUniqueIndex?.name) {
    console.log('No unique mobile index found — nothing to do.');
    return;
  }

  await collection.dropIndex(mobileUniqueIndex.name);
  console.log(`Dropped unique mobile index: ${mobileUniqueIndex.name}`);
}

dropMobileUniqueIndex()
  .catch((error) => {
    console.error('Unable to drop the unique mobile index:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
