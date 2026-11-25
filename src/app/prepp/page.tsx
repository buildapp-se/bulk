import { meta } from '../meta';
import { Page } from '@/components/Page';
import { Prep } from '@/components/Prep';

export const metadata = meta('prepp/', 'Prepp · Bulk.', 'Se vilka smakkit som delar knivjobb och vad varje låda kostar med veckans priser hos Willys, Coop, ICA och Lidl.');

export default function PreppPage() {
  return <Page><Prep /></Page>;
}
