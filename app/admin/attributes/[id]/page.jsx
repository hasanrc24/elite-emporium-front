import { AttributeValues } from '@/components/admin/catalog/attribute-values';

export const metadata = { title: 'Attribute values' };
export default async function AttributeValuesPage({ params }) {
  const { id } = await params;
  return <AttributeValues id={id} />;
}
