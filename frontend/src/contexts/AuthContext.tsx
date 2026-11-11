
import {
    createContext,
    useContext,
    useState,
    type ReactNode
} from "react";

import api from "../services/api";

export type UserRole =
    | "STUDENT"
    | "LECTURER"
    | "LIBRARIAN"
    | "ADMIN";

export interface Account {
    accountId: number;
    fullName: string;
    email: string;
    role: UserRole;
}

interface LoginResponse {
    success: boolean;
    message: string;
    data: {
        token: string;
        account: Account;
    };
}

interface AuthContextType {
    account: Account | null;
    isAuthenticated: boolean;
    login: (
        email: string,
        password: string,
        role: UserRole
    ) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "lbms_token";
const ACCOUNT_KEY = "lbms_account";

function getSavedAccount(): Account | null {
    try {
        const token = sessionStorage.getItem(TOKEN_KEY);
        const savedAccount = sessionStorage.getItem(ACCOUNT_KEY);

        if (!token || !savedAccount) {
            return null;
        }

        return JSON.parse(savedAccount) as Account;
    } catch {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(ACCOUNT_KEY);
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [account, setAccount] = useState<Account | null>(getSavedAccount);

    const login = async (
        email: string,
        password: string,
        role: UserRole
    ) => {
        const response = await api.post<LoginResponse>("/auth/login", {
            email,
            password,
            role
        });

        const { token, account: loggedInAccount } = response.data.data;

        if (!token || !loggedInAccount) {
            throw new Error("Phản hồi đăng nhập từ máy chủ không hợp lệ.");
        }

        if (loggedInAccount.role !== role) {
            throw new Error("Vai trò tài khoản không khớp.");
        }

        sessionStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(
            ACCOUNT_KEY,
            JSON.stringify(loggedInAccount)
        );

        setAccount(loggedInAccount);
    };

    const logout = () => {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(ACCOUNT_KEY);
        setAccount(null);
    };

    return (
        <AuthContext.Provider
            value={{
                account,
                isAuthenticated: account !== null,
                login,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }

    return context;
}
