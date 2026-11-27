import useAuth from '../../hooks/useAuth';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import FeedbackForm from '../../components/common/FeedbackForm';

/** Customer portal: tell the team what you think of the website. */
export default function MyFeedback() {
  const { user } = useAuth();
  return (
    // One column in the middle of the screen (heading + form)
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader title="Give Feedback" subtitle="Tell us what works and what we should improve. Every message reaches our team." />
      <Card className="animate-fade-up" title="Your feedback">
        <FeedbackForm name={user?.full_name || ''} email={user?.email || ''} />
      </Card>
    </div>
  );
}
