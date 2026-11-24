import { ComingSoon, TabScreen } from '@/navigation/TabScreen';

export default function ArchiveTab() {
  return (
    <TabScreen title="Archive">
      <ComingSoon
        title="Everything you share, kept"
        message="Your moments and monthly recaps are saved here, month by month."
      />
    </TabScreen>
  );
}
