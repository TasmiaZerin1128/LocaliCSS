import api from "../api";

const testUrl = async (url) => {
    try {
        console.log(url);
        const response = await api.get("/testPage", url);
        return response;
    } catch (err) {
        return err.response;
    }
}

export { testUrl };