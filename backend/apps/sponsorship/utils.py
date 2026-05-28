import stripe
import logging
from django.conf import settings

stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", "")
logger = logging.getLogger("apps")

def create_stripe_product_and_price(tier):
    """
    Creates a Product and two Prices (Monthly and Annual) in Stripe for a given SponsorshipTier.
    Returns a dict with stripe price IDs.
    """
    if not stripe.api_key:
        return {}

    images = []
    if hasattr(tier, 'image') and tier.image:
        try:
            images.append(tier.image.url)
        except Exception:
            pass

    # Create Product
    product = stripe.Product.create(
        name=f"[{tier.tenant.name}] {tier.name}",
        description=tier.description or f"Membresía {tier.name} para {tier.tenant.name}",
        images=images if images else None,
    )
    
    # Create Monthly Price
    monthly_price = stripe.Price.create(
        unit_amount=int(tier.price * 100),
        currency="mxn",
        product=product.id,
        recurring={"interval": "month"} if tier.type == "SUBSCRIPTION" else None,
    )
    
    price_ids = {'monthly': monthly_price.id}

    # Create Annual Price (only if SUBSCRIPTION)
    if tier.type == "SUBSCRIPTION":
        # price_annual is calculated in the model's save method
        annual_price = stripe.Price.create(
            unit_amount=int(tier.price_annual * 100),
            currency="mxn",
            product=product.id,
            recurring={"interval": "year"},
        )
        price_ids['annual'] = annual_price.id
        
    return price_ids

def get_checkout_session(user, tier, success_url, cancel_url, target_id=None, is_annual=False):
    """
    Creates a Stripe Checkout Session for a sponsorship.
    """
    if not stripe.api_key:
        raise ValueError("Stripe API key is not configured.")

    metadata = {
        "tenant_id": str(tier.tenant.id),
        "user_id": str(user.id),
        "tier_id": str(tier.id),
        "billing_cycle": "ANNUAL" if is_annual else "MONTHLY",
        "type": "patreon_sponsorship"
    }
    if target_id:
        metadata["target_id"] = str(target_id)
        
    price_id = tier.stripe_price_id_annual if is_annual and tier.stripe_price_id_annual else tier.stripe_price_id

    if not price_id:
        raise ValueError("This tier does not have a valid Stripe price ID configured.")

    session_data = {
        "payment_method_types": ["card"],
        "line_items": [{
            "price": price_id,
            "quantity": 1,
        }],
        "mode": "subscription" if tier.type == "SUBSCRIPTION" else "payment",
        "success_url": success_url,
        "cancel_url": cancel_url,
        "customer_email": user.email,
        "metadata": metadata,
    }
    
    session = stripe.checkout.Session.create(**session_data)
    return session
