import { collection } from 'firebase/firestore';

export function tenantCollection(
  firestore: any,
  tenantId: string,
  collectionName: string
) {
  if (!tenantId) {
    throw new Error('tenantId ausente');
  }

  return collection(
    firestore,
    'tenants',
    tenantId,
    collectionName
  );
}