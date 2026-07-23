import { renderRouter, screen } from 'expo-router/testing-library';

describe('tab shell', () => {
  it('boots to Welcome, then the Today tab renders its dashboard', async () => {
    await renderRouter('src/app', { initialUrl: '/' });

    expect(await screen.findByText(/Your body\./i)).toBeTruthy();
  });

  it('renders the Today dashboard when navigated directly', async () => {
    await renderRouter('src/app', { initialUrl: '/(tabs)/today' });

    expect(await screen.findByText(/What's next/i)).toBeTruthy();
    expect(screen.getByText('Upper Body A')).toBeTruthy();
  });

  it('renders the Plan tab', async () => {
    await renderRouter('src/app', { initialUrl: '/(tabs)/plan' });

    expect(await screen.findByText('My Plan')).toBeTruthy();
  });
});
