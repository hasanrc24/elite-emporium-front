import { notFound } from 'next/navigation';
import { ContentEditor } from '@/components/admin/content-editor';

export default async function ContentEditorPage({ params }) { const { kind, id } = await params; if (!['pages', 'posts'].includes(kind)) notFound(); return <ContentEditor kind={kind} id={id} />; }
