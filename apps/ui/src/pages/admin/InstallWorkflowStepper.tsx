import { Step, StepContent, StepLabel, Stepper, Typography } from "@mui/material";
import {
  ESPHOME_WIZARD_INSTALL_STEPS,
  esphomeLifecycleLabel,
} from "../../lib/device-utils";

type Props = {
  /** Which lifecycle step is current (0 = Configured, 1 = Awaiting installation, …). */
  activeStep: number;
};

/** Same install workflow list on Review and Device created — all steps stay expanded. */
export function InstallWorkflowStepper({ activeStep }: Props) {
  return (
    <Stepper activeStep={activeStep} orientation="vertical" nonLinear>
      {ESPHOME_WIZARD_INSTALL_STEPS.map((step, index) => (
        <Step key={step.state} completed={index < activeStep} expanded>
          <StepLabel>{esphomeLifecycleLabel(step.state)}</StepLabel>
          <StepContent>
            <Typography variant="body2" color="text.secondary">
              {step.detail}
            </Typography>
          </StepContent>
        </Step>
      ))}
    </Stepper>
  );
}
