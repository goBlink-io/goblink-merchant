-- Atomic refund creation: locks the payment row, validates, and inserts in a single transaction
CREATE OR REPLACE FUNCTION create_refund_atomic(
  p_payment_id uuid,
  p_amount numeric,
  p_reason text,
  p_merchant_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_total_refunded numeric;
  v_refund_id uuid;
BEGIN
  -- Lock the payment row
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id AND merchant_id = p_merchant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment_not_found'; END IF;
  IF v_payment.status NOT IN ('confirmed', 'partially_refunded') THEN RAISE EXCEPTION 'payment_not_refundable'; END IF;

  -- Sum existing non-failed refunds
  SELECT COALESCE(SUM(amount), 0) INTO v_total_refunded
  FROM refunds
  WHERE payment_id = p_payment_id AND status != 'failed';

  IF v_total_refunded + p_amount > v_payment.amount THEN
    RAISE EXCEPTION 'exceeds_payment_amount';
  END IF;

  -- Insert refund
  INSERT INTO refunds (payment_id, merchant_id, amount, currency, reason, status)
  VALUES (p_payment_id, p_merchant_id, p_amount, v_payment.currency, p_reason, 'pending')
  RETURNING id INTO v_refund_id;

  -- Update payment status
  IF v_total_refunded + p_amount >= v_payment.amount THEN
    UPDATE payments SET status = 'refunded' WHERE id = p_payment_id;
  ELSE
    UPDATE payments SET status = 'partially_refunded' WHERE id = p_payment_id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_refund_id,
    'amount', p_amount,
    'currency', v_payment.currency,
    'is_full_refund', (v_total_refunded + p_amount >= v_payment.amount),
    'total_refunded', v_total_refunded + p_amount
  );
END;
$$;
