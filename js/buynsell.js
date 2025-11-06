

document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.trade-tab');
    const input1Label = document.getElementById('input1Label');
    const submitBtn = document.getElementById('tradeSubmitBtn');
    const payCurrency = document.getElementById('payCurrency');
    const receiveCurrency = document.getElementById('receiveCurrency');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Get active tab type
            const tabType = this.getAttribute('data-tab');
            
            // Update labels and button text based on tab
            if (tabType === 'buy') {
                input1Label.textContent = "You'll pay";
                submitBtn.textContent = "Log in to buy";
                payCurrency.textContent = "VND";
                receiveCurrency.textContent = "BTC";
            } else {
                input1Label.textContent = "You'll sell";
                submitBtn.textContent = "Log in to sell";
                payCurrency.textContent = "BTC";
                receiveCurrency.textContent = "VND";
            }
            
            // Clear input values when switching tabs
            document.getElementById('payAmount').value = '';
            document.getElementById('receiveAmount').value = '';
        });
    });
    
    // Form submission
    submitBtn.addEventListener('click', function() {
        const activeTab = document.querySelector('.trade-tab.active').getAttribute('data-tab');
        const payAmount = document.getElementById('payAmount').value;
        const receiveAmount = document.getElementById('receiveAmount').value;
        
        if (!payAmount || parseFloat(payAmount) <= 0) {
            alert('Please enter a valid amount to pay/sell.');
            return;
        }
        if (!receiveAmount || parseFloat(receiveAmount) <= 0) {
            alert('Please enter a valid amount to receive.');
            return;
        }
        
        // Redirect to login page (or handle authentication)
        window.location.href = '/pages/login.html';
    });
});