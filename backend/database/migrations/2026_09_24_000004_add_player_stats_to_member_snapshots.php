<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('member_snapshots', function (Blueprint $t) {
            if (!Schema::hasColumn('member_snapshots', 'war_stars')) {
                $t->integer('war_stars')->default(0)->after('war_preference');
            }
            if (!Schema::hasColumn('member_snapshots', 'attack_wins')) {
                $t->integer('attack_wins')->default(0)->after('war_stars');
            }
            if (!Schema::hasColumn('member_snapshots', 'exp_level')) {
                $t->integer('exp_level')->default(0)->after('attack_wins');
            }
            if (!Schema::hasColumn('member_snapshots', 'capital_contributions')) {
                $t->integer('capital_contributions')->default(0)->after('exp_level');
            }
        });
    }
    public function down(): void {
        Schema::table('member_snapshots', function (Blueprint $t) {
            foreach (['war_stars','attack_wins','exp_level','capital_contributions'] as $col) {
                if (Schema::hasColumn('member_snapshots', $col)) $t->dropColumn($col);
            }
        });
    }
};
