// Created: 2026-04-19 12:50:32
const { chromium } = require('playwright');

const URL = 'http://localhost:8765/shopping-list.html';
let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // localStorage 초기화 (깨끗한 상태에서 테스트)
  await page.goto(URL);
  await page.evaluate(() => localStorage.removeItem('shopping'));
  await page.reload();

  // ─────────────────────────────────────────────
  console.log('\n📋 [TEST 1] 초기 상태 확인');
  // ─────────────────────────────────────────────
  const emptyMsg = await page.locator('#empty').isVisible();
  assert(emptyMsg, '"아직 아이템이 없습니다." 문구가 보인다');

  const itemCount = await page.locator('#list li').count();
  assert(itemCount === 0, '리스트가 비어있다 (0개)');

  const stats = await page.locator('#stats').textContent();
  assert(stats.trim() === '', '통계 문구가 비어있다');

  // ─────────────────────────────────────────────
  console.log('\n📋 [TEST 2] 아이템 추가 — 버튼 클릭');
  // ─────────────────────────────────────────────
  await page.fill('#itemInput', '사과');
  await page.click('#addBtn');

  const countAfter1 = await page.locator('#list li').count();
  assert(countAfter1 === 1, '아이템 1개 추가됨');

  const firstText = await page.locator('#list li .item-text').first().textContent();
  assert(firstText === '사과', '추가된 아이템 텍스트가 "사과"');

  const inputVal = await page.inputValue('#itemInput');
  assert(inputVal === '', '추가 후 입력창이 비워진다');

  const emptyHidden = await page.locator('#empty').isHidden();
  assert(emptyHidden, '아이템 추가 후 빈 목록 문구가 사라진다');

  // ─────────────────────────────────────────────
  console.log('\n📋 [TEST 3] 아이템 추가 — Enter 키');
  // ─────────────────────────────────────────────
  await page.fill('#itemInput', '바나나');
  await page.press('#itemInput', 'Enter');

  const countAfter2 = await page.locator('#list li').count();
  assert(countAfter2 === 2, 'Enter로 두 번째 아이템 추가됨 (총 2개)');

  await page.fill('#itemInput', '우유');
  await page.press('#itemInput', 'Enter');

  const countAfter3 = await page.locator('#list li').count();
  assert(countAfter3 === 3, 'Enter로 세 번째 아이템 추가됨 (총 3개)');

  // ─────────────────────────────────────────────
  console.log('\n📋 [TEST 4] 빈 입력값으로 추가 시도');
  // ─────────────────────────────────────────────
  await page.fill('#itemInput', '   ');
  await page.click('#addBtn');
  const countAfterEmpty = await page.locator('#list li').count();
  assert(countAfterEmpty === 3, '공백 입력 시 아이템이 추가되지 않는다');

  // ─────────────────────────────────────────────
  console.log('\n📋 [TEST 5] 통계 업데이트 확인');
  // ─────────────────────────────────────────────
  const statsText = await page.locator('#stats').textContent();
  assert(statsText === '0 / 3 완료', `통계가 "0 / 3 완료"로 표시된다 (실제: "${statsText}")`);

  // ─────────────────────────────────────────────
  console.log('\n📋 [TEST 6] 체크 기능');
  // ─────────────────────────────────────────────
  const firstCheckbox = page.locator('#list li').first().locator('input[type="checkbox"]');
  await firstCheckbox.check();

  const firstLiDone = await page.locator('#list li').first().getAttribute('class');
  assert(firstLiDone?.includes('done'), '체크 후 li에 "done" 클래스가 붙는다');

  const firstTextStyle = await page.locator('#list li').first().locator('.item-text').evaluate(el =>
    getComputedStyle(el).textDecoration
  );
  assert(firstTextStyle.includes('line-through'), '체크된 아이템에 취소선이 적용된다');

  const statsAfterCheck = await page.locator('#stats').textContent();
  assert(statsAfterCheck === '1 / 3 완료', `체크 후 통계가 "1 / 3 완료" (실제: "${statsAfterCheck}")`);

  // ─────────────────────────────────────────────
  console.log('\n📋 [TEST 7] 체크 해제');
  // ─────────────────────────────────────────────
  await firstCheckbox.uncheck();
  const firstLiUndone = await page.locator('#list li').first().getAttribute('class');
  assert(!firstLiUndone?.includes('done'), '체크 해제 후 "done" 클래스가 제거된다');

  const statsAfterUncheck = await page.locator('#stats').textContent();
  assert(statsAfterUncheck === '0 / 3 완료', `체크 해제 후 통계가 "0 / 3 완료" (실제: "${statsAfterUncheck}")`);

  // ─────────────────────────────────────────────
  console.log('\n📋 [TEST 8] 아이템 삭제');
  // ─────────────────────────────────────────────
  const secondItemText = await page.locator('#list li').nth(1).locator('.item-text').textContent();
  const delBtn = page.locator('#list li').nth(1).locator('.delete-btn');
  await delBtn.click();

  const countAfterDel = await page.locator('#list li').count();
  assert(countAfterDel === 2, '삭제 후 아이템이 2개가 된다');

  const remainingTexts = await page.locator('#list li .item-text').allTextContents();
  assert(!remainingTexts.includes(secondItemText), `삭제한 "${secondItemText}"가 목록에서 사라진다`);

  // ─────────────────────────────────────────────
  console.log('\n📋 [TEST 9] "완료된 항목 지우기" 버튼');
  // ─────────────────────────────────────────────
  await page.locator('#list li').first().locator('input[type="checkbox"]').check();

  const statsBeforeClear = await page.locator('#stats').textContent();
  assert(statsBeforeClear === '1 / 2 완료', `완료 전 통계 확인 (실제: "${statsBeforeClear}")`);

  await page.click('#clearBtn');

  const countAfterClear = await page.locator('#list li').count();
  assert(countAfterClear === 1, '"완료된 항목 지우기" 후 체크된 항목이 모두 삭제된다');

  const remainingAfterClear = await page.locator('#list li .item-text').first().textContent();
  assert(remainingAfterClear === '우유', '미완료 항목 "우유"는 남아있다');

  // ─────────────────────────────────────────────
  console.log('\n📋 [TEST 10] localStorage 영속성');
  // ─────────────────────────────────────────────
  await page.fill('#itemInput', '계란');
  await page.press('#itemInput', 'Enter');

  const savedData = await page.evaluate(() => localStorage.getItem('shopping'));
  const parsed = JSON.parse(savedData);
  assert(Array.isArray(parsed) && parsed.length === 2, 'localStorage에 2개 아이템이 저장됨');

  await page.reload();
  const countAfterReload = await page.locator('#list li').count();
  assert(countAfterReload === 2, '새로고침 후에도 아이템이 유지된다 (localStorage)');

  // ─────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`결과: ${passed + failed}개 테스트 중 ✅ ${passed}개 통과, ❌ ${failed}개 실패`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();