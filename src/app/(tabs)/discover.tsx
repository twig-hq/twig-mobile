import { ComingSoon, TabScreen } from '@/navigation/TabScreen';

export default function DiscoverTab() {
  return (
    <TabScreen title="Discover">
      <ComingSoon
        title="A new question every week"
        message="You both answer the same question, then open each other's answers together."
      />
    </TabScreen>
  );
}
