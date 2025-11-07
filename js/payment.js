const FIAT_CODES = new Set(['USD', 'VND', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'KRW', 'SGD', 'IDR', 'MYR', 'THB', 'CHF', 'PHP']);

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const trade = {
        payAmount: params.get('pay_amount'),
        receiveAmount: params.get('receive_amount'),
        payCurrency: params.get('pay_currency'),
        receiveCurrency: params.get('receive_currency'),
        mode: params.get('mode')
    };

    const elements = {
        payValue: document.getElementById('paySummaryValue'),
        receiveValue: document.getElementById('receiveSummaryValue'),
        rateLabel: document.getElementById('exchangeRateLabel'),
        modeLabel: document.getElementById('paymentModeLabel'),
        paymentRate: document.getElementById('paymentRate'),
        paymentFee: document.getElementById('paymentFee'),
        paymentTotal: document.getElementById('paymentTotal'),
        reference: document.getElementById('paymentReference'),
        countdown: document.getElementById('paymentCountdown'),
        statusText: document.getElementById('paymentStatusText'),
        summary: document.getElementById('paymentSummary'),
        breakdown: document.getElementById('paymentBreakdown'),
        alert: document.getElementById('missingTradeNotice'),
        confirmBtn: document.getElementById('confirmPaymentBtn'),
        editBtn: document.getElementById('editTradeBtn'),
        startOverBtn: document.getElementById('startOverBtn')
    };

    const goBackToTrade = () => {
        window.location.href = '/pages/buynsell.html';
    };

    elements.editBtn?.addEventListener('click', goBackToTrade);
    elements.startOverBtn?.addEventListener('click', goBackToTrade);

    if (!isValidTrade(trade)) {
        showMissingState(elements);
        return;
    }

    hydrateTradeSummary(trade, elements);
    startCountdown(elements.countdown, 10 * 60, elements.statusText);

    elements.confirmBtn?.addEventListener('click', () => {
        elements.confirmBtn.disabled = true;
        elements.confirmBtn.textContent = 'Creating checkout...';
        setTimeout(() => {
            elements.statusText.textContent = 'Checkout created. Redirecting you securely...';
        }, 400);
        setTimeout(() => {
            // alert('Payment successful! Thank you for choosing UKX!');
            window.location.href = '/pages/thankyou.html';
        }, 1800);
    });
});

function isValidTrade(trade) {
    const requiredFields = ['payAmount', 'receiveAmount', 'payCurrency', 'receiveCurrency', 'mode'];
    return requiredFields.every((key) => {
        const value = trade[key];
        if (value === null || value === undefined || value === '') return false;
        if (key.endsWith('Amount')) {
            return !Number.isNaN(Number(value));
        }
        return true;
    });
}

function showMissingState(elements) {
    elements.summary?.classList.add('hidden');
    elements.breakdown?.classList.add('hidden');
    elements.alert?.classList.remove('hidden');
    elements.statusText.textContent = 'We were unable to locate an active trade session.';
    elements.confirmBtn?.setAttribute('disabled', 'true');
}

function hydrateTradeSummary(trade, elements) {
    const payAmount = Number(trade.payAmount);
    const receiveAmount = Number(trade.receiveAmount);
    const payIsFiat = isFiat(trade.payCurrency);
    const receiveIsFiat = isFiat(trade.receiveCurrency);
    const unitRate = receiveAmount > 0 && payAmount > 0
        ? receiveAmount / payAmount
        : 0;

    const formattedPay = formatAmount(payAmount, payIsFiat);
    const formattedReceive = formatAmount(receiveAmount, receiveIsFiat, receiveAmount < 1 ? 6 : 4);
    const formattedRate = unitRate
        ? `1 ${trade.payCurrency.toUpperCase()} ≈ ${formatAmount(unitRate, receiveIsFiat)} ${trade.receiveCurrency.toUpperCase()}`
        : 'Rate unavailable';

    elements.payValue.textContent = `${formattedPay} ${trade.payCurrency.toUpperCase()}`;
    elements.receiveValue.textContent = `${formattedReceive} ${trade.receiveCurrency.toUpperCase()}`;
    elements.rateLabel.textContent = formattedRate;
    elements.modeLabel.textContent = `Mode · ${trade.mode?.toUpperCase()}`;
    elements.paymentRate.textContent = formattedRate;

    const feeDetails = calculateFee(payAmount, payIsFiat);
    elements.paymentFee.textContent = `${formatAmount(feeDetails.fee, payIsFiat)} ${trade.payCurrency.toUpperCase()}`;
    elements.paymentTotal.textContent = `${formatAmount(feeDetails.total, payIsFiat)} ${trade.payCurrency.toUpperCase()}`;

    const reference = buildReference(trade);
    elements.reference.textContent = reference;

    elements.statusText.textContent = `You are buying ${trade.receiveCurrency.toUpperCase()} using ${trade.payCurrency.toUpperCase()}. Your reference is ${reference}.`;
}

function isFiat(code = '') {
    return FIAT_CODES.has(code.toUpperCase());
}

function formatAmount(value, isFiat, maxFractionDigitsOverride) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
        return '--';
    }

    const options = isFiat
        ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        : {
            minimumFractionDigits: amount >= 1 ? 2 : 4,
            maximumFractionDigits: maxFractionDigitsOverride ?? (amount >= 1 ? 6 : 8)
        };

    return amount.toLocaleString('en-US', options);
}

function calculateFee(payAmount, payIsFiat) {
    if (!Number.isFinite(payAmount)) {
        return { fee: 0, total: 0 };
    }

    const feeRate = payIsFiat ? 0.006 : 0.001;
    const minimumFee = payIsFiat ? 1 : 0.0001;
    const fee = Math.max(payAmount * feeRate, minimumFee);
    const total = payAmount + fee;
    return { fee, total };
}

function buildReference(trade) {
    const modeFragment = (trade.mode || 'trade').slice(0, 3).toUpperCase();
    const currencyFragment = (trade.receiveCurrency || 'XX').slice(0, 2).toUpperCase();
    const timestampFragment = Date.now().toString().slice(-6);
    return `UKX-${modeFragment}${currencyFragment}-${timestampFragment}`;
}

function startCountdown(element, totalSeconds, statusTextElement) {
    if (!element) return;
    let secondsLeft = totalSeconds;

    const render = () => {
        const minutes = Math.floor(secondsLeft / 60);
        const seconds = secondsLeft % 60;
        element.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    render();

    const timer = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft <= 0) {
            clearInterval(timer);
            element.textContent = '00:00';
            if (statusTextElement) {
                statusTextElement.textContent = 'Quote expired. Refresh from the trade page to get a new rate.';
            }
            return;
        }
        render();
    }, 1000);
}
