import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures, updatedSettingsResponse, waitForApiRequest} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Labs', async () => {
    test('requires confirmation before enabling Automations and disables it afterwards', async ({page}) => {
        const labsSetting = responseFixtures.settings.settings.find(setting => setting.key === 'labs');
        const labs = JSON.parse(String(labsSetting?.value || '{}'));
        const labsDisabled = JSON.stringify({...labs, automations: false});
        const labsEnabled = JSON.stringify({...labs, automations: true});

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: updatedSettingsResponse([
                {key: 'labs', value: labsDisabled}
            ])},
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'labs', value: labsEnabled}
            ])}
        }});

        await page.goto('/');

        const labsSection = page.getByTestId('labs');
        await labsSection.getByRole('button', {name: 'Open'}).click();
        await labsSection.getByRole('tab', {name: 'Beta features'}).click();

        const automationsToggle = labsSection.getByRole('switch', {name: 'Automations'});
        await expect(automationsToggle).not.toBeChecked();

        await automationsToggle.click();

        const confirmationModal = page.getByTestId('feature-toggle-confirmation-modal');
        await expect(confirmationModal).toBeVisible();
        await expect(confirmationModal).toContainText('Enabling Automations is a one-way street');

        await confirmationModal.getByRole('button', {name: 'Cancel'}).click();

        await expect(confirmationModal).not.toBeVisible();
        await expect(automationsToggle).not.toBeChecked();
        expect(lastApiRequests.editSettings).toBeUndefined();

        await automationsToggle.click();
        await confirmationModal.getByRole('button', {name: 'Enable Automations'}).click();

        const editSettings = await waitForApiRequest(lastApiRequests, 'editSettings');
        expect(editSettings.body).toEqual({
            settings: [{key: 'labs', value: labsEnabled}]
        });

        await expect(confirmationModal).not.toBeVisible();
        await expect(automationsToggle).toBeChecked();
        await expect(automationsToggle).toBeDisabled();
    });

    test.skip('Uploading/downloading redirects', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            uploadRedirects: {method: 'POST', path: '/redirects/upload/', response: {}},
            downloadRedirects: {method: 'GET', path: '/redirects/download/', response: 'redirects'}
        }});

        await page.goto('/');

        const labsSection = page.getByTestId('labs');

        await labsSection.getByRole('button', {name: 'Open'}).click();
        await labsSection.getByRole('tab', {name: 'Beta features'}).click();

        const fileChooserPromise = page.waitForEvent('filechooser');

        await labsSection.getByText('Upload redirects file').click();

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(`${__dirname}/../../utils/files/redirects.yml`);

        await expect(page.getByTestId('toast-success')).toContainText('Redirects uploaded');

        expect(lastApiRequests.uploadRedirects).toBeTruthy();

        await labsSection.getByRole('button', {name: 'Download current redirects'}).click();

        await expect(page.locator('iframe#iframeDownload')).toHaveAttribute('src', /\/redirects\/download\//);

        expect(lastApiRequests.downloadRedirects).toBeTruthy();
    });

    test.skip('Uploading/downloading routes', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            uploadRoutes: {method: 'POST', path: '/settings/routes/yaml/', response: {}},
            downloadRoutes: {method: 'GET', path: '/settings/routes/yaml/', response: 'routes'}
        }});

        await page.goto('/');

        const labsSection = page.getByTestId('labs');

        await labsSection.getByRole('button', {name: 'Open'}).click();
        await labsSection.getByRole('tab', {name: 'Beta features'}).click();

        const fileChooserPromise = page.waitForEvent('filechooser');

        await labsSection.getByText('Upload routes file').click();

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(`${__dirname}/../../utils/files/routes.yml`);

        await expect(page.getByTestId('toast-success')).toContainText('Routes uploaded');

        expect(lastApiRequests.uploadRoutes).toBeTruthy();

        await labsSection.getByRole('button', {name: 'Download current routes'}).click();

        await expect(page.locator('iframe#iframeDownload')).toHaveAttribute('src', /\/settings\/routes\/yaml\//);

        expect(lastApiRequests.downloadRoutes).toBeTruthy();
    });
});
