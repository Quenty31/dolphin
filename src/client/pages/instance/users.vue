<template>
<section class="_section dp-instance-users">
	<div class="title"><fa :icon="faUsers"/> {{ $t('users') }}</div>
	<div class="content">
		<x-pagination :pagination="pagination" #default="{items}" class="users" ref="users">
			<div class="user" v-for="(user, i) in items" :key="user.id" :data-index="i">
				<dp-avatar :user="user" class="avatar"/>
				<div class="body">
					<dp-user-name :user="user" class="name"/>
					<dp-acct :user="user" class="acct"/>
				</div>
			</div>
		</x-pagination>
	</div>
	<div class="footer">
		<x-button primary @click="addUser()"><fa :icon="faPlus"/> {{ $t('addUser') }}</x-button>
	</div>
</section>
</template>

<script lang="ts">
import Vue from 'vue';
import { faPlus, faUsers } from '@fortawesome/free-solid-svg-icons';
import XButton from '../../components/ui/button.vue';
import XPagination from '../../components/ui/pagination.vue';

export default Vue.extend({
	metaInfo() {
		return {
			title: `${this.$t('users')} | ${this.$t('instance')}`
		};
	},

	components: {
		XButton,
		XPagination,
	},

	data() {
		return {
			pagination: {
				endpoint: 'admin/show-users',
				limit: 10,
				offsetMode: true
			},
			faPlus, faUsers
		}
	},

	methods: {
		async addUser() {
			const { canceled: canceled1, result: username } = await this.$root.dialog({
				title: this.$t('username'),
				input: true
			});
			if (canceled1) return;

			const { canceled: canceled2, result: password } = await this.$root.dialog({
				title: this.$t('password'),
				input: { type: 'password' }
			});
			if (canceled2) return;

			this.$root.api('admin/accounts/create', {
				username: username,
				password: password,
			}).then(res => {
				this.$refs.users.reload();
				this.$root.dialog({
					type: 'success',
					splash: true
				});
			}).catch(e => {
				this.$root.dialog({
					type: 'error',
					text: e.id
				});
			});
		}
	}
});
</script>

<style lang="scss" scoped>
.dp-instance-users {
	> .content {
		max-height: 300px;
		overflow: auto;
		
		> .users {
			> .user {
				display: flex;
				align-items: center;

				> .avatar {
					width: 50px;
					height: 50px;
				}

				> .body {
					padding: 8px;

					> .name {
						display: block;
						font-weight: bold;
					}

					> .acct {
						opacity: 0.5;
					}
				}
			}
		}
	}
}
</style>
