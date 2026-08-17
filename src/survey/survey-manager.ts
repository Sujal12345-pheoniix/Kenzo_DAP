/**
 * Survey Manager — event or schedule-triggered survey widget supporting CSAT, NPS, multi-choice, and open feedback.
 * @module survey/survey-manager
 */

export interface SurveyQuestion {
  id: string;
  type: 'nps' | 'csat' | 'single_choice' | 'text';
  question: string;
  options?: string[];
}

export interface SurveyItem {
  id: string;
  title: string;
  questions: SurveyQuestion[];
}

export class SurveyManager {
  private shadowHost: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;

  constructor(private readonly onSubmitSurvey?: (surveyId: string, answers: Record<string, any>) => void) {
    this.initShadowDom();
  }

  private initShadowDom(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById('kenzo-survey-root')) return;

    this.shadowHost = document.createElement('div');
    this.shadowHost.id = 'kenzo-survey-root';
    this.shadowHost.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483700; pointer-events: none;';
    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      .survey-card {
        position: fixed;
        bottom: 24px;
        right: 24px;
        pointer-events: auto;
        width: 360px;
        max-width: calc(100vw - 32px);
        background: #181825;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 16px;
        padding: 20px;
        color: #cdd6f4;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 12px 40px rgba(0,0,0,0.5);
        z-index: 2147483700;
        animation: survey-slide-up 0.3s ease-out;
      }
      .survey-title {
        font-size: 16px;
        font-weight: 700;
        color: #f5e0dc;
        margin-bottom: 14px;
      }
      .survey-question-text {
        font-size: 13px;
        font-weight: 600;
        color: #cba6f7;
        margin-bottom: 10px;
      }
      .nps-container {
        display: flex;
        gap: 4px;
        margin-bottom: 16px;
      }
      .nps-btn {
        flex: 1;
        height: 32px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.15);
        background: rgba(255,255,255,0.05);
        color: #cdd6f4;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .nps-btn:hover, .nps-btn.selected {
        background: #6366f1;
        border-color: #6366f1;
        color: #ffffff;
      }
      .survey-submit-btn {
        width: 100%;
        padding: 10px;
        border-radius: 8px;
        background: linear-gradient(135deg, #6366f1, #4f46e5);
        color: #fff;
        border: none;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        margin-top: 10px;
      }
      @keyframes survey-slide-up {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    this.shadowRoot.appendChild(style);
    document.body.appendChild(this.shadowHost);
  }

  triggerSurvey(survey: SurveyItem): void {
    if (typeof document === 'undefined' || !this.shadowRoot) return;

    const card = document.createElement('div');
    card.className = 'survey-card';

    let currentAnswers: Record<string, any> = {};

    card.innerHTML = `
      <div class="survey-title">${survey.title}</div>
      ${survey.questions
        .map(
          (q) => `
        <div class="survey-question-block" data-question-id="${q.id}">
          <div class="survey-question-text">${q.question}</div>
          ${
            q.type === 'nps'
              ? `
            <div class="nps-container">
              ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                .map((num) => `<button class="nps-btn" data-val="${num}">${num}</button>`)
                .join('')}
            </div>
          `
              : `<input type="text" class="survey-text-input" placeholder="Your feedback..." style="width:100%; padding:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:6px; color:#fff; font-size:12px; box-sizing:border-box;" />`
          }
        </div>
      `,
        )
        .join('')}
      <button class="survey-submit-btn">Submit Feedback</button>
    `;

    card.querySelectorAll('.nps-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const parent = target.parentElement;
        parent?.querySelectorAll('.nps-btn').forEach((b) => b.classList.remove('selected'));
        target.classList.add('selected');
        const qId = target.closest('.survey-question-block')?.getAttribute('data-question-id');
        if (qId) {
          currentAnswers[qId] = Number(target.getAttribute('data-val'));
        }
      });
    });

    const submitBtn = card.querySelector('.survey-submit-btn');
    submitBtn?.addEventListener('click', () => {
      card.remove();
      if (this.onSubmitSurvey) {
        this.onSubmitSurvey(survey.id, currentAnswers);
      }
    });

    this.shadowRoot.appendChild(card);
  }
}
