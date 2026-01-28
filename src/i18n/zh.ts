import { flattenObject } from "es-toolkit";

const zh = {
    general: {
        confirm: '確認',
        youCannotUseThisButton: '你不能使用這個按鈕.',
        sessionExpired: '對話已過期. 請重新開始.',
        errorOccurred: '發生錯誤. <@161038123529142272>',
    },
    raidType: {
        kirollas: {
            simpleName: '靈王',
            originalName: 'Twisted Spirit King Kirollas'
        },
        carno: {
            simpleName: '獸王',
            originalName: 'Twisted Beast King Carno'
        }
    },
    raidCompletionWorkflow: {
        youHaveCompletedBothRaids: '你已經完成Kirollas + Carno了嗎?',
        pleaseSelectDate: '請選擇日期:',
        today: '今天 ({0})',
        yesterday: '昨天 ({0})',
        pleaseSelectRaidDate: '請選擇Raid完成日期:',
        selectDate: '請選擇日期:',
        pleaseSelectValidDate: '請選擇有效的日期.',
        selectCompletedRaid: '選擇完成的Raid',
        whichRaidDidYouComplete: '你完成了哪個Raid?',
        haveYouCompletedAllCharacters: '你完成了所有角色的HC嗎?',
        youHaveNoCharactersRegistered: '你沒有註冊任何角色. 請先使用 {0} 綁定角色.',
        pleaseSelectCompletedCharacters: '請選擇完成的角色',
        selectedCharacters: '已選擇: {0}',
        selectCharacterAndConfirm: '選擇你完成的角色, 然後點擊確認:',
        clickConfirmToSaveOrChangeSelection: '點擊確認保存, 或更改你的選擇.',
        noCharacterSelected: '沒有選擇角色. 請重新選擇.',
        userHasCompletedRaidTracking: '{0} 已完成記錄.',
    }
};

const zhMessages = flattenObject(zh) as Record<string, string>;

export default zhMessages;