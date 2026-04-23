(function () {
  const current = SnakeUser.requireUser();
  const query = new URLSearchParams(location.search);
  const itemId = query.get('item') || 'slow';
  const sourceMethod = query.get('method') || 'credit_card';
  const items = SnakeStore.items;
  const item = items[itemId];

  if (!item) {
    alert('商品不存在，已返回菜单。');
    location.href = 'menu.html';
    return;
  }

  const productNameEl = document.getElementById('checkoutProductName');
  const productDescEl = document.getElementById('checkoutProductDesc');
  const priceEl = document.getElementById('checkoutPrice');
  const amountEl = document.getElementById('summaryAmount');
  const totalEl = document.getElementById('summaryTotal');
  const iconEl = document.getElementById('checkoutIcon');
  const errorEl = document.getElementById('checkoutError');
  const payloadEl = document.getElementById('checkoutPayload');
  const successEl = document.getElementById('checkoutSuccess');

  const firstNameEl = document.getElementById('firstName');
  const lastNameEl = document.getElementById('lastName');
  const emailEl = document.getElementById('email');
  const countryEl = document.getElementById('country');

  productNameEl.textContent = item.name;
  productDescEl.textContent = item.desc;
  priceEl.textContent = item.cardPrice;
  amountEl.textContent = item.cardPrice;
  totalEl.textContent = item.cardPrice;
  iconEl.textContent = item.icon;

  // 预填邮箱
  if (current && current.email) emailEl.value = current.email;

  let selectedMethod = sourceMethod;
  const methods = Array.from(document.querySelectorAll('.checkout-method'));
  methods.forEach(function(btn){
    btn.classList.toggle('active', btn.dataset.method === selectedMethod);
    btn.addEventListener('click', function(){
      methods.forEach(function(other){ other.classList.remove('active'); });
      btn.classList.add('active');
      selectedMethod = btn.dataset.method;
    });
  });

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
    successEl.classList.add('hidden');
  }

  function clearError() {
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
  }

  function buildPayload() {
    return {
      productId: item.id,
      productName: item.name,
      amount: item.cardPrice,
      currency: 'USD',
      userInfo: {
        firstName: firstNameEl.value.trim(),
        lastName: lastNameEl.value.trim(),
        email: emailEl.value.trim(),
        country: countryEl.value
      },
      paymentMethod: selectedMethod,
      apiPlaceholders: {
        createOrder: '/api/create-order',
        createPayment: '/api/pay',
        returnUrl: '/payment-success',
        cancelUrl: '/payment-fail'
      }
    };
  }

  document.getElementById('checkoutPreviewBtn').addEventListener('click', function(){
    payloadEl.textContent = JSON.stringify(buildPayload(), null, 2);
    payloadEl.classList.remove('hidden');
    successEl.classList.add('hidden');
  });

  document.getElementById('checkoutPayBtn').addEventListener('click', function(){
    const payload = buildPayload();
    if (!payload.userInfo.firstName) return showError('请填写 First Name');
    if (!payload.userInfo.lastName) return showError('请填写 Last Name');
    if (!payload.userInfo.email) return showError('请填写 Email');
    if (!validateEmail(payload.userInfo.email)) return showError('请输入有效邮箱地址');
    if (!payload.userInfo.country) return showError('请选择国家/地区');

    clearError();
    payloadEl.classList.add('hidden');

    const btn = this;
    btn.disabled = true;
    btn.textContent = '处理中...';

    // 演示支付成功：发放道具并回写用户信息
    setTimeout(function(){
      SnakeUser.updateCurrentUser(function(u){
        u.email = payload.userInfo.email;
        u.checkoutInfo = payload.userInfo;
        u.itemInventory = u.itemInventory || {};
        u.itemInventory[item.id] = (u.itemInventory[item.id] || 0) + 1;
      });

      successEl.innerHTML = [
        '<strong>演示支付成功</strong><br>',
        '支付方式：<strong>' + selectedMethod + '</strong><br>',
        '已发放：<strong>' + item.name + '</strong> x1<br>',
        '2 秒后将返回菜单页'
      ].join('');
      successEl.classList.remove('hidden');

      btn.disabled = false;
      btn.textContent = 'Pay Now';

      setTimeout(function(){
        location.href = 'menu.html?pay=success&item=' + encodeURIComponent(item.id);
      }, 2000);
    }, 900);
  });
})();