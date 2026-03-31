import axios from 'axios'

axios.defaults.baseURL = ''

// Enable sending cookies with all requests
axios.defaults.withCredentials = true

// // Add a request interceptor
// axios.interceptors.request.use(
//   function (config) {
//     const token = Cookies.get('token');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   function (error) {
//     return Promise.reject(error);
//   }
// );

axios.interceptors.response.use(
	function (response) {
		return response
	},
	function (error) {
		const originalRequest = error.config
		const reqUrl = typeof originalRequest?.url === 'string' ? originalRequest.url : ''
		const onGuestSharePage = typeof window !== 'undefined' && typeof window.location?.pathname === 'string' && window.location.pathname.startsWith('/student/share')
		const isPublicShareRequest = reqUrl.includes('/api/students/public/share')
		// Don't redirect to login for maintenance errors or network errors
		if (error.response && error.response.status === 401 && !originalRequest._retry && !error.response.data?.maintenance) {
			if (onGuestSharePage || isPublicShareRequest) {
				return Promise.reject(error)
			}
			originalRequest._retry = true
			window.location.href = '/login'

			return axios(originalRequest)
		}
		// For network errors or maintenance errors, just reject
		return Promise.reject(error)
	}
)

export default axios
