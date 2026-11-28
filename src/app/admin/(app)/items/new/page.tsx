import { ProductForm } from "@/components/admin/ProductForm";
export const metadata = { title: "Add item" };
export default function NewItem() {
  return (<div className="grid gap-6"><h1 className="font-display text-5xl">Add an item</h1><ProductForm /></div>);
}
