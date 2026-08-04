import { useEffect } from 'react';
import { useOnboardingState, STEPS } from './onboarding-context';
import { useAuth } from '../../../lib/auth-context';
import { useToast } from '../../../components/ui/Toast';
import { Step1Welcome } from './steps/Step1Welcome';
import { Step2Workspace } from './steps/Step2Workspace';
import { Step3Knowledge } from './steps/Step3Knowledge';
import { Step4Processing } from './steps/Step4Processing';
import { Step5Customize } from './steps/Step5Customize';
import { Step6Embed } from './steps/Step6Embed';
import { Step7Verify } from './steps/Step7Verify';
import { Step8FirstChat } from './steps/Step8FirstChat';
import { Step9Success } from './steps/Step9Success';
import { Button } from '../../../components/ui/Button';

function HelpPanel({ stepId }: { stepId: string }) {
  const tips: Record<string, string> = {
    welcome: 'Start by teaching BurFlow about your website so it can act as your AI sales agent from day one.',
    workspace: 'Your workspace is where BurFlow learns your brand, offers, and conversion goals so it can qualify and assist visitors.',
    knowledge: 'Start with a website scan for your core product and service information. Add documents later as an optional layer of supporting knowledge.',
    processing: 'BurFlow is indexing your site and preparing a sales-focused knowledge graph for answers, recommendations, and lead capture.',
    customize: 'Tune the widget to match your brand and guide visitors toward the right next step.',
    embed: 'Copy the snippet and place it on your site so BurFlow can start engaging visitors immediately.',
    verify: 'After adding the snippet, verify that the widget is live and responding correctly.',
    'first-chat': 'Try a real sales question to see how BurFlow handles discovery, qualification, and handoff.',
    success: 'Your BurFlow sales agent is now ready to assist visitors, capture leads, and guide buying conversations.',
  };

  return (
    <div className="bg-[var(--color-accent-50)] border border-[var(--color-accent-100)] rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-[var(--color-accent-600)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-[var(--color-accent-800)]">Need help?</p>
          <p className="text-xs text-[var(--color-accent-600)] mt-1">{tips[stepId] || 'Follow the steps below to set up your chatbot.'}</p>
        </div>
      </div>
    </div>
  );
}

export function OnboardingPage() {
  const state = useOnboardingState();
  const { addToast } = useToast();
  const currentStepInfo = STEPS[state.data.currentStep];
  const progress = ((state.data.currentStep) / (STEPS.length - 1)) * 100;
  const isLastStep = state.data.currentStep >= STEPS.length - 1;
  const isFirstStep = state.data.currentStep === 0;

  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      state.restoreWorkspace();
    }
  }, [authLoading, isAuthenticated, state.restoreWorkspace]);

  const renderStep = () => {
    switch (state.data.currentStep) {
      case 0: return <Step1Welcome onStart={() => state.markStepComplete(0)} />;
      case 1: return <Step2Workspace data={state.data.workspace} onChange={state.updateWorkspace} onCreateWorkspace={state.createWorkspace} />;
      case 2: return <Step3Knowledge
        data={state.data.knowledge}
        onRemoveFile={state.removeFile}
        onAddWebsite={state.addWebsite}
        onRemoveWebsite={state.removeWebsite}
        onUpdateFaqs={state.updateFaqs}
        onUploadFile={state.uploadFile}
        onSubmitFaqs={state.submitFaqs}
        onCrawlWebsites={state.crawlWebsites}
      />;
      case 3: return <Step4Processing
        knowledge={state.data.knowledge}
        processing={state.data.processing}
        onCheckStatus={state.checkProcessingStatus}
      />;
      case 4: return <Step5Customize data={state.data.custom} businessProfile={state.getBusinessProfile()} onChange={state.updateCustom} />;
      case 5: return <Step6Embed
        agentId={state.data.embed.agentId}
        widgetToken={state.data.embed.widgetToken}
        snippet={state.data.embed.snippet}
        onGenerateToken={state.generateWidgetToken}
        onUpdateConfig={state.updateWidgetConfig}
        onGetSnippet={state.getWidgetSnippet}
      />;
      case 6: return <Step7Verify
        verified={state.data.embed.widgetVerified}
        snippet={state.data.embed.snippet}
        onVerify={state.verifyInstallation}
      />;
      case 7: return <Step8FirstChat
        agentId={state.data.embed.agentId}
        messages={state.data.testMessages}
        businessProfile={state.getBusinessProfile()}
        onSend={state.sendTestMessage}
      />;
      case 8: return <Step9Success
        data={state.data}
        onComplete={state.completeOnboarding}
        onSeedDemo={state.seedDemoData}
        onReset={state.resetOnboarding}
      />;
      default: return null;
    }
  };

  const handleNext = async () => {
    if (state.data.currentStep === 1) {
      if (!state.data.workspace.tenantId) {
        try {
          await state.createWorkspace();
        } catch (err: any) {
          addToast(err?.message || 'Failed to create workspace', 'error');
          return;
        }
      }
      state.markStepComplete(1);
    } else if (state.data.currentStep === 2) {
      if (state.data.knowledge.files.length > 0 || state.data.knowledge.faqs.trim() || state.data.knowledge.websites.length > 0) {
        state.markStepComplete(2);
      }
    } else if (state.data.currentStep === 4) {
      try {
        await state.updateWidgetConfig();
      } catch {
        addToast('Failed to save widget config', 'error');
      }
      state.markStepComplete(4);
    } else if (state.data.currentStep === 6) {
      state.markStepComplete(6);
    } else {
      state.markStepComplete(state.data.currentStep);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)]">
      <div className="sticky top-0 z-10 bg-white border-b border-[var(--color-neutral-100)]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-[var(--color-neutral-900)]">BurFlow</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent-100)] text-[var(--color-accent-700)] font-medium">Onboarding</span>
          </div>
          {state.data.currentStep > 1 && state.data.currentStep < 9 && (
            <button onClick={() => state.goToStep(1)} className="text-sm text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)] transition-colors">
              Start Over
            </button>
          )}
        </div>
        <div className="h-1 bg-[var(--color-neutral-100)]">
          <div className="h-full bg-[var(--color-accent-600)] transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {state.data.currentStep < 9 && (
            <aside className="hidden lg:block w-56 shrink-0">
              <nav className="sticky top-24 space-y-1">
                {STEPS.map((step) => {
                  const isActive = state.data.currentStep === step.step;
                  const isCompleted = state.data.completedSteps.includes(step.step);
                  const displayNum = step.step;
                  return (
                    <button
                      key={step.id}
                      disabled={!isCompleted && !isActive}
                      onClick={() => (isCompleted || isActive) && state.goToStep(step.step)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                        isActive ? 'bg-[var(--color-accent-50)] text-[var(--color-accent-700)] font-semibold' :
                        isCompleted ? 'text-[var(--color-neutral-500)]' :
                        'text-[var(--color-neutral-300)] cursor-not-allowed'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isActive ? 'bg-[var(--color-accent-600)] text-white' :
                        isCompleted ? 'bg-[var(--color-success-100)] text-[var(--color-success-700)]' :
                        'bg-[var(--color-neutral-100)] text-[var(--color-neutral-300)]'
                      }`}>
                        {isCompleted ? '✓' : displayNum + 1}
                      </span>
                      <span className="truncate">{step.label}</span>
                      {step.time && <span className="ml-auto text-xs text-[var(--color-neutral-400)]">{step.time}</span>}
                    </button>
                  );
                })}
              </nav>
            </aside>
          )}

          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-[var(--color-neutral-100)] p-6 shadow-sm">
              {currentStepInfo && currentStepInfo.id !== 'welcome' && currentStepInfo.id !== 'success' && (
                <HelpPanel stepId={currentStepInfo.id} />
              )}
              {renderStep()}

              {!isFirstStep && !isLastStep && (
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--color-neutral-100)]">
                  <Button variant="secondary" onClick={state.prevStep}>
                    ← Back
                  </Button>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--color-neutral-400)]">Step {state.data.currentStep} of {STEPS.length - 1}</span>
                    <Button onClick={handleNext}>
                      {state.data.currentStep === 7 ? 'Finish' : 'Continue →'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
