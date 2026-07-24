import { useSkin } from "../skins/SkinProvider";
import { ThemeConfigurator } from "../skins/ThemeConfigurator";

/** Delegates chrome to the active UI skin Layout + theme configurator FAB. */
export function AppLayout() {
  const { skin } = useSkin();
  const Layout = skin.Layout;
  return (
    <>
      <Layout />
      <ThemeConfigurator />
    </>
  );
}
