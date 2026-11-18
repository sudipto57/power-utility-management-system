// Website feedback form (public: visitors and logged-in customers can both use it).
// Nothing is saved in the database (the team's tables stay unchanged):
// each message is emailed to the team's inbox (FEEDBACK_EMAIL, or EMAIL_FROM if that is empty).
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { feedbackEmail, sendEmail } from '../utils/email.js';
import { optionalEmail, optionalText, requireOneOf, requireText, requireWholeNumber } from '../utils/validate.js';

export const FEEDBACK_TOPICS = ['Website design', 'Bills and payments', 'Login and account', 'Service requests', 'New idea', 'Other'];

// POST /api/feedback   body: { rating (1-5), topic, message, name (optional), email (optional) }
export async function sendFeedback(req, res) {
  const body = req.body || {};
  const rating = requireWholeNumber(body.rating, 'Rating', { min: 1 });
  if (rating > 5) throw new ApiError(400, 'Rating must be from 1 to 5 stars');
  const topic = requireOneOf(body.topic, FEEDBACK_TOPICS, 'Topic');
  const message = requireText(body.message, 'Message', 2000);
  if (message.length < 10) throw new ApiError(400, 'Please write at least 10 characters');
  const name = optionalText(body.name, 'Name', 100);
  const email = optionalEmail(body.email);

  if (!env.email.feedbackTo) {
    throw new ApiError(503, 'Feedback is not set up on this server yet. Please try again later');
  }

  const { subject, html } = feedbackEmail({ rating, topic, message, name, email });
  const sent = await sendEmail({ to: env.email.feedbackTo, subject, html, replyTo: email });
  if (!sent) throw new ApiError(503, 'We could not send your feedback right now. Please try again in a minute');

  res.status(201).json({ data: { message: 'Thank you! Your feedback reached our team.' } });
}
