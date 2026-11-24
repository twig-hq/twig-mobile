import { ComingSoon, TabScreen } from '@/navigation/TabScreen';
import { greeting } from '@/navigation/tabs';

export default function HomeTab() {
  return (
    <TabScreen title={greeting(new Date().getHours())}>
      <ComingSoon
        title="Nothing shared yet"
        message="Check-ins, photos and voice notes from you and your people will land here."
      />
    </TabScreen>
  );
}
