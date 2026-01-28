import { flattenObject } from "es-toolkit";

const en = {
    general: {
        confirm: 'Confirm',
        youCannotUseThisButton: 'You cannot use this button.',
        sessionExpired: 'Conversation expired. Please start again.',
        errorOccurred: 'Error occurred. <@161038123529142272>',
    },
    raidType: {
        kirollas: {
            simpleName: 'Kirollas',
            originalName: 'Twisted Spirit King Kirollas'
        },
        carno: {
            simpleName: 'Carno',
            originalName: 'Twisted Beast King Carno'
        }
    },
    raidCompletionWorkflow: {
        youHaveCompletedBothRaids: 'You have completed Kirollas + Carno?',
        pleaseSelectDate: 'Please select date:',
        today: 'Today ({0})',
        yesterday: 'Yesterday ({0})',
        pleaseSelectRaidDate: 'Please select Raid completion date:',
        selectDate: 'Please select date:',
        pleaseSelectValidDate: 'Please select a valid date.',
        selectCompletedRaid: 'Select completed Raid',
        whichRaidDidYouComplete: 'Which Raid did you complete?',
        haveYouCompletedAllCharacters: 'You have completed all characters HC?',
        youHaveNoCharactersRegistered: 'You have no characters registered. Please use {0} to bind characters.',
        pleaseSelectCompletedCharacters: 'Please select completed characters',
        selectedCharacters: 'Selected: {0}',
        selectCharacterAndConfirm: 'Select your completed characters, then click confirm:',
        clickConfirmToSaveOrChangeSelection: 'Click confirm to save, or change your selection.',
        noCharacterSelected: 'No characters selected. Please select again.',
        userHasCompletedRaidTracking: '{0} has completed recording.',
        recordPartialCharacters: 'Record partial characters',
        completeAllCharactersHC: 'Complete all characters HC',
        otherMembersCharactersDetected: 'Other members\' characters detected: {0}',
        detectedMemberNotice: 'If you confirm you are included in the image, you can click the button below to record all character completions. If you have not completed all characters HC, please submit individually.',
        noticeOfNotCompleted: '## Please note, recording is not complete \nPlease select the content to record:',
    }
};

const enMessages = flattenObject(en) as Record<string, string>;

export default enMessages;