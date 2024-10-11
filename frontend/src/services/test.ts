import api from "../api";

const testUrl = async (url: string) => {
    try {
        console.log(url);
        const response = await api.get(`/testPage?url=${url}`);
        return response;
    } catch (err: any) {
        return err.response;
    }
}

const testLocally = async () => {
    try {
        const response = await api.get(`/testLocal`);
        return response;
    } catch (err: any) {
        return err.response;
    }
}

export { testUrl, testLocally };