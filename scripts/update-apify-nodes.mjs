#!/usr/bin/env node
/**
 * update-apify-nodes.mjs
 *
 * Applies three targeted improvements to the Google Maps Reviews pipeline in all
 * four n8n workflow files (base-cold-email & cold-email-system, both Email
 * Preparation and Research Report):
 *
 *  1. reviewsSort: "newest" → "relevant"
 *     Relevance surfaces the most-impactful (thumbs-up) reviews.  Negative reviews
 *     attract far more engagement clicks, so they float to the top even if old.
 *
 *  2. Reviews filter code — sort 1★ first, validate business name match
 *     The old code searched forward and stopped at 5, so it could include three 3★
 *     reviews before getting to two 1★ ones.  New code collects ALL ≤3★ reviews,
 *     sorts ascending (worst first), then takes top-5.  Adds a fuzzy business-name
 *     check to avoid using reviews for the wrong company.  Spreads ...it.json so
 *     no lead fields are lost downstream.
 *
 *  3. Research Report Reviews1 — same improvements + richer HTML cards with
 *     star glyphs, left-border accent, and a count summary header.
 *
 * Cost impact: zero — no change to reviewsMaxCount (still 50) or call frequency.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Improved code strings ─────────────────────────────────────────────────

const REVIEWS_CODE_EMAIL_PREP = `\
// REVIEWS PROCESSOR — filters 1-3★, validates business match, sorts worst-first
const out = [];
for (const it of items) {
  const src = it.json.reviews || it.json.reviewsAll || it.json.userReviews || [];
  const returnedTitle = String(it.json.title || it.json.name || '').trim();
  const companyName   = String(it.json.company_name || it.json.company || '').trim();

  // --- Business-name sanity check ---
  // If Apify returned a totally different business, skip its reviews rather than
  // personalising emails with someone else's complaints.
  let businessMatches = true;
  if (returnedTitle && companyName) {
    const stop = new Set(['the','a','an','and','or','of','for','in','at','llc','inc','ltd','co','corp','&','and']);
    const words = (s) => s.toLowerCase().split(/\\W+/).filter(w => w.length > 2 && !stop.has(w));
    const overlap = words(returnedTitle).filter(w => words(companyName).includes(w)).length;
    if (overlap === 0 && words(companyName).length > 0 && words(returnedTitle).length > 0) {
      businessMatches = false;
    }
  }

  if (!businessMatches) {
    out.push({
      json: {
        ...it.json,
        google_reviews_summary: \`No reviews used — Google Maps returned "\${returnedTitle}" which may not match "\${companyName}". Treat as no reviews available.\`,
        reviews_match_warning: true,
      },
    });
    continue;
  }

  // --- Collect ALL ≤3★ reviews, sort 1★ first, then take worst 5 ---
  const low = [];
  for (const r of src) {
    const rating = Number(r.rating || r.stars || r.score);
    if (rating && rating <= 3) {
      low.push({
        rating,
        text: String(r.text || r.reviewText || r.comment || '').trim().slice(0, 400),
        date: r.publishAt || r.time || r.date || '',
        url:  r.url  || r.link  || '',
      });
    }
  }

  // 1★ before 2★ before 3★
  low.sort((a, b) => a.rating - b.rating);
  const top5 = low.slice(0, 5);

  const totalReviews = src.length;
  const lowCount     = low.length;

  const summary = top5.length
    ? \`\${lowCount} of \${totalReviews} reviews are 1–3★. Worst \${top5.length}:\\n\\n\` +
      top5.map((r, i) => \`\${i + 1}. \${'★'.repeat(r.rating)}\${'☆'.repeat(5 - r.rating)}\${r.date ? \` (\${r.date})\` : ''}\\n\${r.text}\${r.url ? \`\\n\${r.url}\` : ''}\`).join('\\n\\n')
    : 'None found';

  out.push({
    json: {
      ...it.json,
      google_reviews_summary: summary,
      low_review_count:        lowCount,
      total_reviews_scraped:   totalReviews,
    },
  });
}
return out;`;

const REVIEWS_CODE_RESEARCH_REPORT = `\
// REVIEWS PROCESSOR — filters 1-3★, validates business match, sorts worst-first, outputs HTML
const list = (items || []).map(i => i.json).flatMap(j => Array.isArray(j) ? j : [j]);
const all  = list.flatMap(j => j.reviews || j.reviewsAll || j.userReviews || []);

// Business-name sanity check
const returnedTitle = String(list[0]?.title || list[0]?.name || '').trim();
const companyName   = String(list[0]?.company_name || list[0]?.company || '').trim();
let businessMatches = true;
if (returnedTitle && companyName) {
  const stop    = new Set(['the','a','an','and','or','of','for','in','at','llc','inc','ltd','co','corp','&','and']);
  const words   = (s) => s.toLowerCase().split(/\\W+/).filter(w => w.length > 2 && !stop.has(w));
  const overlap = words(returnedTitle).filter(w => words(companyName).includes(w)).length;
  if (overlap === 0 && words(companyName).length > 0 && words(returnedTitle).length > 0) businessMatches = false;
}

if (!businessMatches) {
  return [{
    json: {
      reviewsHTML:           \`<p><em>No reviews used — Google Maps returned "\${returnedTitle}" which may not match "\${companyName}".</em></p>\`,
      reviews_match_warning: true,
      low_review_count:      0,
      total_reviews_scraped: all.length,
    },
  }];
}

// Collect ALL ≤3★, sort 1★ first, take worst 5
const low = [];
for (const r of all) {
  const rating = Number(r.rating || r.stars || r.score);
  if (rating && rating <= 3) low.push({ ...r, rating });
}
low.sort((a, b) => a.rating - b.rating);
const top5 = low.slice(0, 5);

let reviewsHTML = '';
if (top5.length) {
  reviewsHTML += \`<p><strong>\${low.length} of \${all.length} reviews are 1–3★.</strong> Showing worst \${top5.length}:</p>\\n\`;
  for (const r of top5) {
    const stars   = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const dateRaw = r.publishAt || r.time || r.date || '';
    const text    = String(r.text || r.reviewText || r.comment || '').trim();
    const author  = String(r.authorName || r.userName || '');
    reviewsHTML += '<div class="review-card" style="border:1px solid #ddd; padding:10px; margin-bottom:10px; border-left:4px solid #e53e3e;">';
    if (author)  reviewsHTML += \`<strong>\${author}</strong> \`;
    reviewsHTML += \`<span style="color:#e53e3e;">\${stars}</span>\`;
    if (dateRaw) reviewsHTML += \` <span style="color:#666; font-size:0.85em;">(\${dateRaw})</span>\`;
    if (text)    reviewsHTML += \`<p style="margin:8px 0 0;">\${text}</p>\`;
    reviewsHTML += '</div>';
  }
} else {
  reviewsHTML = '<p>No recent 1–3★ Google reviews found.</p>';
}

return [{ json: { reviewsHTML, low_review_count: low.length, total_reviews_scraped: all.length } }];`;

// ─── File targets ──────────────────────────────────────────────────────────

const FILES = [
  {
    path: 'base-cold-email/Email Preparation.json',
    reviewsNodeName: 'Reviews',
    reviewsCode: REVIEWS_CODE_EMAIL_PREP,
    apifyNodeName: 'Google Reviews (1-3 Stars)',
  },
  {
    path: 'base-cold-email/Research Report.json',
    reviewsNodeName: 'Reviews1',
    reviewsCode: REVIEWS_CODE_RESEARCH_REPORT,
    apifyNodeName: 'Google Reviews (1-3)',
  },
  {
    path: 'cold-email-system/Email Preparation.json',
    reviewsNodeName: 'Reviews',
    reviewsCode: REVIEWS_CODE_EMAIL_PREP,
    apifyNodeName: 'Google Reviews (1-3 Stars)',
  },
  {
    path: 'cold-email-system/Research Report.json',
    reviewsNodeName: 'Reviews1',
    reviewsCode: REVIEWS_CODE_RESEARCH_REPORT,
    apifyNodeName: 'Google Reviews (1-3)',
  },
];

// ─── Apply updates ─────────────────────────────────────────────────────────

let totalChanges = 0;

for (const target of FILES) {
  const absPath = resolve(ROOT, target.path);
  const data = JSON.parse(readFileSync(absPath, 'utf8'));
  let changed = 0;

  for (const node of data.nodes) {
    // 1. Update Reviews filter code
    if (node.name === target.reviewsNodeName && node.type === 'n8n-nodes-base.code') {
      const before = node.parameters.jsCode;
      node.parameters.jsCode = target.reviewsCode;
      if (before !== node.parameters.jsCode) {
        console.log(`  ✅ [${target.path}] "${node.name}" — code replaced`);
        changed++;
      }
    }

    // 2. Change reviewsSort from "newest" to "relevant"
    if (node.name === target.apifyNodeName && node.type === 'n8n-nodes-base.httpRequest') {
      const before = node.parameters.jsonBody;
      node.parameters.jsonBody = before.replace(
        '"reviewsSort": "newest"',
        '"reviewsSort": "relevant"',
      );
      if (before !== node.parameters.jsonBody) {
        console.log(`  ✅ [${target.path}] "${node.name}" — reviewsSort: newest → relevant`);
        changed++;
      }
    }
  }

  if (changed > 0) {
    writeFileSync(absPath, JSON.stringify(data, null, 2));
    console.log(`  💾 Saved ${target.path} (${changed} change(s))`);
    totalChanges += changed;
  } else {
    console.log(`  ⚠️  No changes applied to ${target.path}`);
  }
}

console.log(`\nDone. ${totalChanges} total changes across ${FILES.length} files.`);
