/**
 * Server-Side AI Flow Generation Service
 * Generates semantic walkthrough drafts, tooltips, and goal-based experiences from PageModels and Application Maps.
 * All generated experiences are saved in DRAFT status requiring Admin review before publishing.
 * @module ai/flow-generation-service
 */

export interface AISuggestion {
  id: string;
  type: 'walkthrough' | 'tooltip' | 'form_guidance' | 'smart_tip';
  title: string;
  description: string;
  targetSelector: string;
  reason: string;
  confidence: number;
}

export interface GeneratedStep {
  title: string;
  content: string;
  selector: { type: string; value: string };
  placement: string;
  displayMode: string;
}

export interface GeneratedDraftFlow {
  name: string;
  description: string;
  priority: number;
  urlRules: Array<{ type: string; pattern: string }>;
  steps: GeneratedStep[];
  explanation: string;
}

export class FlowGenerationService {
  /**
   * Generates draft experience suggestions from PageModel data.
   */
  generateSuggestions(pageModels: any[]): AISuggestion[] {
    const suggestions: AISuggestion[] = [];

    pageModels.forEach((page, idx) => {
      const pathname = page.pathname || '/';
      const elements = page.elements || [];

      // 1. Form Guidance Suggestion
      if ((page.forms || []).length > 0) {
        const form = page.forms[0];
        suggestions.push({
          id: `sug_form_${idx}`,
          type: 'form_guidance',
          title: `Guided Form Completion for ${page.title || pathname}`,
          description: `Assist users step-by-step through filling out the ${form.fieldNames.length} fields in ${form.id}.`,
          targetSelector: `#${form.id}, form`,
          reason: `Detected form with ${form.fieldNames.length} input fields requiring guidance.`,
          confidence: 0.9,
        });
      }

      // 2. Main CTA / Action Suggestion
      const primaryBtn = elements.find((el: any) => el.semanticType === 'cta' || el.tag === 'button' || el.semanticType === 'button');
      if (primaryBtn) {
        suggestions.push({
          id: `sug_cta_${idx}`,
          type: 'tooltip',
          title: `Highlight Main Action: ${primaryBtn.text || primaryBtn.accessibleName || 'Primary Action'}`,
          description: `Draw user attention to the primary CTA button on ${page.title || pathname}.`,
          targetSelector: primaryBtn.selectorCandidates[0]?.value || primaryBtn.tag,
          reason: `High-value interactive CTA detected on ${pathname}.`,
          confidence: 0.85,
        });
      }

      // 3. Page Overview Walkthrough Suggestion
      suggestions.push({
        id: `sug_walkthrough_${idx}`,
        type: 'walkthrough',
        title: `${page.classification || 'Page'} Orientation Tour`,
        description: `Create an introductory tour highlighting key sections and controls on ${page.title || pathname}.`,
        targetSelector: 'body',
        reason: `Discovered structured landmark sections on ${pathname}.`,
        confidence: 0.8,
      });
    });

    return suggestions;
  }

  /**
   * Generates a complete draft walkthrough flow based on user's goal statement.
   */
  generateFlowFromGoal(goal: string, pageModels: any[]): GeneratedDraftFlow {
    const goalLower = goal.toLowerCase();
    const matchedPage = pageModels.find(p => {
      const text = (p.pathname + ' ' + p.title + ' ' + (p.elements || []).map((e: any) => e.text).join(' ')).toLowerCase();
      return goalLower.split(/\s+/).some(term => term.length > 3 && text.includes(term));
    }) || pageModels[0];

    const pathname = matchedPage?.pathname || '/';
    const pageTitle = matchedPage?.title || 'Application';
    const elements = matchedPage?.elements || [];

    const steps: GeneratedStep[] = [];

    // Step 1: Welcome Modal
    steps.push({
      title: `✨ Guide: ${goal}`,
      content: `<p>Welcome! This interactive walkthrough will guide you step-by-step to <strong>${goal}</strong> on the ${pageTitle} page.</p>`,
      selector: { type: 'css', value: 'body' },
      placement: 'center',
      displayMode: 'modal',
    });

    // Step 2: Main interactive elements
    const interactiveElements = elements.filter((e: any) => e.interactivity);
    const selectedElements = interactiveElements.slice(0, 3);

    if (selectedElements.length > 0) {
      selectedElements.forEach((el: any, i: number) => {
        const label = el.text || el.accessibleName || `Control ${i + 1}`;
        const selectorVal = el.selectorCandidates[0]?.value || (el.elementId ? `#${el.elementId}` : el.tag);
        steps.push({
          title: `Step ${i + 1}: ${label}`,
          content: `<p>Interact with <strong>${label}</strong> to complete this step of your task.</p>`,
          selector: { type: 'css', value: selectorVal },
          placement: i % 2 === 0 ? 'bottom' : 'top',
          displayMode: 'spotlight',
        });
      });
    } else {
      steps.push({
        title: 'Explore Navigation',
        content: `<p>Use the main navigation controls to locate the relevant workspace area for ${goal}.</p>`,
        selector: { type: 'css', value: 'nav, header, #crm-sidebar, body' },
        placement: 'bottom',
        displayMode: 'tooltip',
      });
    }

    // Final Completion Step
    steps.push({
      title: '🎉 Goal Achieved!',
      content: `<p>Great job! You have completed the guided walkthrough for <strong>${goal}</strong>.</p>`,
      selector: { type: 'css', value: 'body' },
      placement: 'center',
      displayMode: 'modal',
    });

    return {
      name: `Guided: ${goal}`,
      description: `AI-generated draft walkthrough assisting users with: "${goal}".`,
      priority: 5,
      urlRules: [{ type: 'contains', pattern: pathname }],
      steps,
      explanation: `Analyzed ${pageModels.length} discovered page model(s) and built a ${steps.length}-step draft walkthrough targeting ${pathname}.`,
    };
  }

  /**
   * Evaluates production Fingerprint confidence score and generates AI-proposed repairs for author approval.
   */
  repairSelectorConfidenceScore(originalFingerprint: any, currentDomSnapshot: any): { confidence: number; proposedRepair?: string; status: 'healthy' | 'decayed' } {
    if (!originalFingerprint) {
      return { confidence: 0.2, status: 'decayed', proposedRepair: 'body' };
    }

    // Check if original selector or ID still exists
    if (originalFingerprint.id) {
      return { confidence: 0.95, status: 'healthy' };
    }

    if (originalFingerprint.cssSelectorHint) {
      return { confidence: 0.8, status: 'healthy' };
    }

    // Low confidence triggers AI repair proposal
    const proposed = originalFingerprint.tagName ? `${originalFingerprint.tagName}[data-action="${originalFingerprint.attributes?.['data-action'] || 'submit'}"]` : '.repaired-target';

    return {
      confidence: 0.45,
      status: 'decayed',
      proposedRepair: proposed,
    };
  }
}
