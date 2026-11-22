import useAuth from '../../hooks/useAuth';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import FeedbackForm from '../../components/common/FeedbackForm';

/** Customer portal: tell the team what you think of the website. */
export default function MyFeedback() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader title="Give feedback" subtitle="Tell us what works and what we should improve. Every message reaches our team." />
      <Card className="max-w-2xl animate-fade-up" title="Your feedback">
        <FeedbackForm name={user?.full_name || ''} email={user?.email || ''} />
      </Card>
    </div>
  );
}
