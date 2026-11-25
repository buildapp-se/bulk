import { meta } from '../meta';
import { Page } from '@/components/Page';
import { Ingredients } from '@/components/Ingredients';

export const metadata = meta('ingredienser/', 'Ingredienser · Bulk.', 'Inköpslistan för veckans matlådor, avrundad till hela förpackningar, med näringen per låda och ingrediens.');

export default function IngredienserPage() {
  return <Page><Ingredients /></Page>;
}
