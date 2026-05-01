import { Redirect } from 'expo-router';

// Default route — expo-router v6 requires this file
// The _layout.tsx handles auth redirects after session loads
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
