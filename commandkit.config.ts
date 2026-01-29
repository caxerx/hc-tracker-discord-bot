import 'dotenv/config';
import { defineConfig, noBuildOnly } from 'commandkit/config';
import { cache } from '@commandkit/cache';
import { i18n } from '@commandkit/i18n';
import { setDriver, tasks } from '@commandkit/tasks';
import { devtools } from '@commandkit/devtools';
// @ts-ignore
import { BullMQDriver } from '@commandkit/tasks/bullmq';
import { workflow } from '@commandkit/workflow';


// set up the driver in non-build processes only
const setupDriver = noBuildOnly(() => {
    setDriver(
        new BullMQDriver({
            url: process.env.REDIS_URL,
        }),
    );
});

setupDriver();

export default defineConfig({
    plugins: [cache(), i18n(), tasks(), devtools(), workflow()],
});
