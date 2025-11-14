import * as S from "./Sidebar.styles";
import SidebarMenu from "./SidebarMenu";
import SidebarToggle from "./SidebarToggle";
import SidebarSetting from "./SidebarSetting";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/store/useAuthStore";

export default function Sidebar() {
  const { isCollapsed } = useSidebarStore();
  const navigate = useNavigate();
  const { signOut } = useAuthStore();

  const handleNavigate = (path) => {
    navigate({ to: path });
  };

  const handleLogout = async () => {
    if (window.confirm("정말 로그아웃 하시겠습니까?")) {
      await signOut();
    }
  };

  return (
    <S.Container $collapsed={isCollapsed}>
      <S.Section>
        <SidebarToggle />
      </S.Section>

      <S.Middle>
        <SidebarMenu onNavigate={handleNavigate} />
      </S.Middle>

      <S.Section>
        <SidebarSetting onNavigate={handleNavigate} />
        {!isCollapsed && <S.Text onClick={handleLogout}>로그아웃</S.Text>}
      </S.Section>
    </S.Container>
  );
}
