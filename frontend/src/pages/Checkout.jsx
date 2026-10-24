import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { getMediaUrl, FALLBACK_COURSE_THUMBNAIL, FALLBACK_EVENT_THUMBNAIL } from '../utils/media';
import { countChapters, isEnrolledIn } from '../config/site';
import CheckoutView from './checkout/CheckoutView';
import { CheckoutLoading, CheckoutMessage, BackLink } from './checkout/CheckoutStatus';

/**
 * Course / live-event checkout (/checkout/:id). Rendering lives in CheckoutView; the server
 * prices the order (sale price, coupon, GST) and verifies the Razorpay signature.
 */
export default function Checkout({ user, onRefreshUser }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ item: null, kind: 'course', loading: true, error: '' });
  const [freeBusy, setFreeBusy] = useState(false);
  const [freeError, setFreeError] = useState('');
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    (async () => {
      try {
        const course = await api.getCourse(id);
        if (alive && course) { setState({ item: course, kind: 'course', loading: false, error: '' }); return; }
      } catch (courseErr) {
        try {
          const event = await api.getEvent(id);
          if (alive && event) { setState({ item: event, kind: 'event', loading: false, error: '' }); return; }
        } catch {
          if (alive) {
            setState({ item: null, kind: 'course', loading: false, error: courseErr?.message && !/not found/i.test(courseErr.message)
              ? 'We could not load this course right now. Please check your connection and try again.'
              : 'This course could not be found. It may have been moved or is no longer on sale.' });
          }
          return;
        }
      }
      if (alive) setState({ item: null, kind: 'course', loading: false, error: 'This course could not be found.' });
    })();
    return () => { alive = false; };
  }, [id]);

  if (state.loading) return <CheckoutLoading />;

  const { item, kind } = state;
  const isEvent = kind === 'event';
  const backTo = item ? (isEvent ? '/' : `/course/${id}/preview`) : '/all-courses';

  if (!item) {
    return (
      <CheckoutMessage icon="alert-triangle" title="Checkout unavailable" backTo="/all-courses"
        actions={<BackLink to="/all-courses" primary>Browse courses</BackLink>}>
        {state.error}
      </CheckoutMessage>
    );
  }

  if (!paid && !isEvent && isEnrolledIn(user, item)) {
    return (
      <CheckoutMessage icon="check-circle" title="You already own this course" backTo={backTo}
        actions={<><BackLink to={`/course/${id}`} primary>Continue learning</BackLink><BackLink to="/dashboard/courses">My courses</BackLink></>}>
        {item.title} is already in your library, so there is nothing to pay.
      </CheckoutMessage>
    );
  }

  if (item.price === 0 || item.isFree) {
    const enroll = async () => {
      if (!user) { navigate('/auth', { state: { from: `/checkout/${id}` } }); return; }
      setFreeBusy(true); setFreeError('');
      try {
        await api.enrollFree(id);
        onRefreshUser?.();
        navigate(isEvent ? '/dashboard/events' : `/course/${id}`);
      } catch (e) {
        setFreeError(e.message || 'Could not enrol you. Please try again.');
      } finally { setFreeBusy(false); }
    };
    return (
      <CheckoutMessage icon="check-circle" title={`${item.title} is free`} backTo={backTo}
        actions={<button type="button" className="wt-btn wt-btn--primary wt-btn--lg" onClick={enroll} disabled={freeBusy}>{freeBusy ? 'Enrolling…' : user ? 'Enrol for free' : 'Sign in to enrol free'}</button>}>
        {freeError || (user ? 'No payment needed. Enrol now and start right away.' : 'No payment needed. Sign in or create a free account to enrol.')}
      </CheckoutMessage>
    );
  }

  const chapters = countChapters(item);
  const outcomes = (item.outcomes || []).filter(Boolean).slice(0, 4);
  const when = item.dateTime ? new Date(item.dateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  const includes = isEvent
    ? ['Live interactive session', when && `${when} (IST)`, item.duration && `Duration: ${item.duration}`, 'Joining link in your dashboard after payment'].filter(Boolean)
    : [...outcomes, chapters > 0 && `${chapters} module${chapters === 1 ? '' : 's'} at your own pace`, item.languages?.length > 0 && `Language: ${item.languages.join(', ')}`, item.duration && `${item.duration} of content`, 'Access starts right after payment'].filter(Boolean);

  const view = {
    id,
    title: item.title,
    thumb: getMediaUrl(item.thumbnail) || (isEvent ? FALLBACK_EVENT_THUMBNAIL : FALLBACK_COURSE_THUMBNAIL),
    icon: isEvent ? 'calendar' : 'book',
    kindLabel: isEvent ? 'Live event' : 'Online course',
    metaLine: isEvent ? when : [chapters > 0 && `${chapters} module${chapters === 1 ? '' : 's'}`, item.languages?.join(', ')].filter(Boolean).join(' · '),
    includes,
    backTo,
    backLabel: 'Back',
  };

  return (
    <CheckoutView
      key={id}
      kind={kind}
      item={view}
      couponEnabled
      sellerState="Kerala"
      user={user}
      onRefreshUser={onRefreshUser}
      onPaid={() => setPaid(true)}
      title={isEvent ? 'Reserve your seat' : 'Complete your enrolment'}
    />
  );
}
