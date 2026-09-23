<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::table('member_snapshots', function(Blueprint $t){
            if (!Schema::hasColumn('member_snapshots','war_preference')) {
                $t->string('war_preference')->default('in')->after('donations_received');
            }
        });
        Schema::table('player_states', function(Blueprint $t){
            if (!Schema::hasColumn('player_states','war_preference')) {
                $t->string('war_preference')->default('in')->after('estado_manual');
            }
        });
    }
    public function down(): void {
        Schema::table('member_snapshots', function(Blueprint $t){
            if (Schema::hasColumn('member_snapshots','war_preference')) $t->dropColumn('war_preference');
        });
        Schema::table('player_states', function(Blueprint $t){
            if (Schema::hasColumn('player_states','war_preference')) $t->dropColumn('war_preference');
        });
    }
};
