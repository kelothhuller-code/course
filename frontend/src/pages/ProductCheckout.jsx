import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { billingLabel } from '../utils/gst';
import { getMediaUrl } from '../utils/media';
import CheckoutView from './checkout/CheckoutView';
import { CheckoutLoading, CheckoutMessage, BackLink } from './checkout/CheckoutStatus';

/**
 * Checkout for a software licence plan (/checkout/software/:slug?plan=ID[&renew=LICENCE_ID])
 * or a paid service (/checkout/service/:slug[?package=ID]). Rendering lives in CheckoutView;
 * the server prices the order, calculates GST and verifies the payment.
 */
export default function ProductCheckout({ user, onRefreshUser, kind = 'software' }) {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const isService = kind === 'service';
  const renewId = isService ? '' : (params.get('renew') || '');
  const [state, setState] = useState({ item: null, sellerState: 'Kerala', loading: true, error: '' });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    (isService ? api.getService(slug) : api.getSoftware(slug))
      .then((d) => {
        if (!alive) return;
        const item = isService ? d?.service : d?.software;
        setState({ item: item || null, sellerState: d?.sellerState || 'Kerala', loading: false, error: item ? '' : 'This item could not be found.' });
      })
      .catch((e) => alive && setState({ item: null, sellerState: 'Kerala', loading: false, error: /not found/i.test(e.message || '') ? 'This item could not be found.' : 'We could not load this page. Please check your connection and try again.' }));
    return () => { alive = false; };
  }, [slug, isService]);

  const item = state.item;
  const variants = useMemo(() => {
    if (!item) return [];
    if (isService) {
      if (item.packages?.length) {
        return item.packages.map((p) => ({ id: String(p._id), name: p.name, price: p.price, original: p.originalPrice, gstInclusive: p.gstInclusive, sub: p.deliveryTime ? `Delivery: ${p.deliveryTime}` : '', bullets: p.deliverables || [] }));
      }
      if (item.mainOffer) return [{ id: 'main', name: item.title, price: item.mainOffer.price, original: item.mainOffer.originalPrice, gstInclusive: item.mainOffer.gstInclusive, sub: 'Fixed price', bullets: item.deliverables || [] }];
      return [];
    }
    if (!item.plans?.length) {
      // Single-price software: one standard lifetime licence at the product price (server: softwareMainPrice).
      const offer = item.mainOffer;
      const price = Number(offer?.price) || 0;
      if (!(price > 0) || (renewId && (offer.billing || 'lifetime') === 'lifetime')) return [];
      return [{ id: 'main', name: 'Standard licence', price, original: offer?.originalPrice || undefined, gstInclusive: offer?.gstInclusive, sub: `${billingLabel({ billing: offer.billing || 'lifetime' })} · 1 device`, bullets: item.features || [] }];
    }
    return (item.plans || [])
      .filter((p) => !renewId || p.billing !== 'lifetime')
      .map((p) => ({ id: String(p._id), name: p.name, price: p.price, gstInclusive: p.gstInclusive, sub: `${billingLabel(p)} · ${p.maxDevices || 1} device${(p.maxDevices || 1) === 1 ? '' : 's'}`, bullets: p.features || [] }));
  }, [item, isService, renewId]);

  const listBack = isService ? '/services' : '/software';
  const backTo = item ? `${listBack}/${item.slug || item._id}` : listBack;

  if (state.loading) return <CheckoutLoading />;

  if (!item || !variants.length || (isService && item.purchaseMode === 'quote')) {
    return (
      <CheckoutMessage
        icon={state.error ? 'alert-triangle' : 'info'}
        title={state.error ? 'Checkout unavailable' : (isService ? 'This service is priced by quote' : 'Not available to buy online yet')}
        backTo={backTo}
        actions={<><BackLink to={backTo} primary>{item ? `Back to ${item.title}` : `Browse ${isService ? 'services' : 'software'}`}</BackLink></>}
      >
        {state.error || (isService ? 'Tell us what you need on the service page and we will send you a quote.' : 'This software is priced by quote. Request a quote from the product page and we will help you get started.')}
      </CheckoutMessage>
    );
  }

  const view = {
    id: item._id,
    title: item.title,
    thumb: item.thumbnail ? getMediaUrl(item.thumbnail) : '',
    icon: isService ? (item.icon || 'briefcase') : 'key',
    kindLabel: isService ? 'Service' : (renewId ? 'Licence renewal' : 'Software licence'),
    metaLine: '',
    backTo,
    backLabel: 'Back',
    includes: (sel) => {
      const list = [...(sel?.bullets || [])].slice(0, 6);
      if (!isService) {
        list.push(renewId ? 'Extends your existing licence, same key' : 'Licence key shown right after payment and emailed');
        if (item.trialEnabled && !renewId) list.push(`Not sure yet? The app has a free ${item.trialDays || 7}-day trial`);
      } else {
        list.push('Order tracking in your dashboard');
      }
      return list;
    },
  };

  return (
    <CheckoutView
      key={`${kind}-${item._id}-${renewId}`}
      kind={kind}
      item={view}
      variants={variants}
      initialVariantId={params.get(isService ? 'package' : 'plan') || ''}
      renewId={renewId}
      couponEnabled={false}
      sellerState={state.sellerState}
      user={user}
      onRefreshUser={onRefreshUser}
      title={renewId ? 'Renew your licence' : (isService ? 'Complete your order' : 'Get your licence')}
    />
  );
}
