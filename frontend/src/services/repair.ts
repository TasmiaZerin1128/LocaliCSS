import api from "../api";

const loadRepairImages = async (image: string) => {
    try {
        const response = await api.get(`/repair/${image}`);
        console.log(response.data);
        return response;
    } catch (err: any) {
        return err.response;
    }
}

export { loadRepairImages };