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
    ...GN_ANSWERS
};
