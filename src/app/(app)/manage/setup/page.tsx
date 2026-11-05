
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useMemoFirebase } from "@/firebase/provider";
import { useFirestore } from "@/firebase";
import { collection } from "firebase/firestore";
import { useCollection } from "@/firebase/firestore/use-collection";

export default function ManageSetupDataPage() {
  const router = useRouter();
  const firestore = useFirestore();

  const countriesCol = useMemoFirebase(() => collection(firestore, 'countries'), [firestore]);
  const { data: countries } = useCollection(countriesCol);

  const storeTypesCol = useMemoFirebase(() => collection(firestore, 'store_types'), [firestore]);
  const { data: storeTypes } = useCollection(storeTypesCol);

  const retailersStoresCol = useMemoFirebase(() => collection(firestore, 'retailers_stores'), [firestore]);
  const { data: retailersStores } = useCollection(retailersStoresCol);

  const topicsCol = useMemoFirebase(() => collection(firestore, 'topics'), [firestore]);
  const { data: topics } = useCollection(topicsCol);

  const setupData = [
      { title: "Countries", count: countries?.length || 0, action: () => router.push('/manage/countries'), enabled: true },
      { title: "Store Types", count: storeTypes?.length || 0, action: () => router.push('/manage/store-types'), enabled: true },
      { title: "Retailers & Stores", count: retailersStores?.length || 0, action: () => router.push('/manage/retailers-and-stores'), enabled: true },
      { title: "Topics", count: topics?.length || 0, action: () => router.push('/manage/topics'), enabled: true },
  ];


  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Manage Setup Data</h1>
       <Card>
        <CardHeader>
          <CardTitle>Application Data</CardTitle>
          <CardDescription>This page is a placeholder. Navigation to setup pages is now in the sidebar.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
