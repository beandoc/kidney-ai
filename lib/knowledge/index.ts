import { BASICS_ANSWERS } from './basics';
import { DIALYSIS_ANSWERS } from './dialysis';
import { TRANSPLANT_ANSWERS } from './transplant';
import { DIET_ANSWERS } from './diet';
import { MEDICATIONS_ANSWERS } from './medications';
import { DIABETES_ANSWERS } from './diabetes';
import { TESTS_ANSWERS } from './tests';
import { PROCEDURES_ANSWERS } from './procedures';
import { STONES_ANSWERS } from './stones';
import { INFECTIONS_ANSWERS } from './infections';
import { GN_ANSWERS } from './gn';
import { PROTEINURIA_ANSWERS } from './proteinuria';
import { EDEMA_ANSWERS } from './edema';
import { LUPUS_ANSWERS } from './lupus';
import { PKD_ANSWERS } from './pkd';
import { PAIN_ANSWERS } from './pain';
import { HYPERTENSION_ANSWERS } from './hypertension';
import { CLINIC_ANSWERS } from './clinic';
import { PERITONEAL_ANSWERS } from './peritoneal';

export const GOLD_ANSWERS: Record<string, string> = {
    ...BASICS_ANSWERS,
    ...DIALYSIS_ANSWERS,
    ...TRANSPLANT_ANSWERS,
    ...DIET_ANSWERS,
    ...MEDICATIONS_ANSWERS,
    ...DIABETES_ANSWERS,
    ...TESTS_ANSWERS,
    ...PROCEDURES_ANSWERS,
    ...STONES_ANSWERS,
    ...INFECTIONS_ANSWERS,
    ...GN_ANSWERS,
    ...PROTEINURIA_ANSWERS,
    ...EDEMA_ANSWERS,
    ...LUPUS_ANSWERS,
    ...PKD_ANSWERS,
    ...PAIN_ANSWERS,
    ...HYPERTENSION_ANSWERS,
    ...CLINIC_ANSWERS,
    ...PERITONEAL_ANSWERS
};
