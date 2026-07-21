import stripe
import logging
from django.conf import settings

stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", "")
logger = logging.getLogger("apps")

def create_stripe_product_and_price(tier):
    """
    Creates a Product and two Prices (Monthly and Annual) in Stripe for a given SponsorshipTier.
    Returns a dict with stripe price IDs. Reuses existing products/prices via metadata if they exist.
    """
    if not stripe.api_key:
        return {}

    # Skip real calls in testing mode
    if getattr(settings, "TESTING", False):
        return {}

    images = []
    if hasattr(tier, 'image') and tier.image:
        try:
            images.append(tier.image.url)
        except Exception:
            pass

    # Search for an existing product with this tenant subdomain and tier level metadata
    product = None
    try:
        for p in stripe.Product.list(limit=100).auto_paging_iter():
            if p.active and p.metadata.get("tenant_subdomain") == tier.tenant.subdomain and p.metadata.get("tier_level") == str(tier.level):
                product = p
                break
    except Exception as list_err:
        logger.error(f"Error listing products in Stripe: {list_err}")

    if not product:
        product = stripe.Product.create(
            name=f"[{tier.tenant.name}] {tier.name}",
            description=tier.description or f"Membresía {tier.name} para {tier.tenant.name}",
            images=images if images else None,
            metadata={
                "tenant_subdomain": tier.tenant.subdomain,
                "tier_level": str(tier.level),
                "sponsorship_tier_id": str(tier.id)
            },
            idempotency_key=f"sponsorship_product_{tier.id}"
        )

    # List active prices for this product to avoid duplicates
    prices_list = []
    try:
        prices_list = stripe.Price.list(product=product.id, active=True).data
    except Exception as prices_err:
        logger.error(f"Error listing prices for product {product.id}: {prices_err}")

    # Check monthly/one-time price
    monthly_price_id = None
    for p in prices_list:
        is_recurring_month = p.recurring and p.recurring.get("interval") == "month"
        is_one_time = not p.recurring
        if tier.type == "SUBSCRIPTION" and is_recurring_month and p.unit_amount == int(tier.price * 100) and p.currency == "mxn":
            monthly_price_id = p.id
            break
        elif tier.type == "DONATION" and is_one_time and p.unit_amount == int(tier.price * 100) and p.currency == "mxn":
            monthly_price_id = p.id
            break

    if not monthly_price_id:
        monthly_price = stripe.Price.create(
            unit_amount=int(tier.price * 100),
            currency="mxn",
            product=product.id,
            recurring={"interval": "month"} if tier.type == "SUBSCRIPTION" else None,
            idempotency_key=f"sponsorship_price_monthly_{tier.id}_{int(tier.price * 100)}"
        )
        monthly_price_id = monthly_price.id

    price_ids = {'monthly': monthly_price_id}

    # Check/Create Annual Price (only if SUBSCRIPTION)
    if tier.type == "SUBSCRIPTION":
        annual_price_id = None
        for p in prices_list:
            if p.recurring and p.recurring.get("interval") == "year" and p.unit_amount == int(tier.price_annual * 100) and p.currency == "mxn":
                annual_price_id = p.id
                break
        if not annual_price_id:
            annual_price = stripe.Price.create(
                unit_amount=int(tier.price_annual * 100),
                currency="mxn",
                product=product.id,
                recurring={"interval": "year"},
                idempotency_key=f"sponsorship_price_annual_{tier.id}_{int(tier.price_annual * 100)}"
            )
            annual_price_id = annual_price.id
        price_ids['annual'] = annual_price_id
        
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
